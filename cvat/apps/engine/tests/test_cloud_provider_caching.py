# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import datetime
import inspect
import os
import time
import unittest
from unittest.mock import MagicMock, patch

from botocore import UNSIGNED
from django.test import override_settings

from cvat.apps.engine import cloud_provider
from cvat.apps.engine.cloud_provider import (
    _SHARED_BOTOCORE_LOADER,
    S3CloudStorage,
    _build_storage_instance,
    _build_storage_instance_cached,
    _FrozenEventEmitter,
    _make_boto3_session,
    db_storage_to_storage_instance,
)
from cvat.apps.engine.models import CloudStorage


def _make_cloud_storage(
    *,
    provider_type="AWS_S3_BUCKET",
    resource="test-bucket",
    credentials_type="ANONYMOUS_ACCESS",
    credentials="",
    specific_attributes="",
):
    return CloudStorage(
        provider_type=provider_type,
        resource=resource,
        credentials_type=credentials_type,
        credentials=credentials,
        specific_attributes=specific_attributes,
        # updated_date is set so model.full_clean() etc. don't choke; not part
        # of the cache key, so use a fixed value.
        updated_date=datetime.datetime(2025, 5, 20, 10, 0, 0, tzinfo=datetime.timezone.utc),
    )


class TestSharedBotocoreLoader(unittest.TestCase):
    """The process-level Loader override must actually be installed on every
    Session built via `_make_boto3_session`. If boto3 silently swaps it out,
    the memory/time savings evaporate without warning."""

    def test_session_uses_shared_loader(self):
        session = _make_boto3_session(
            access_key_id=None, secret_key=None, session_token=None, region=None
        )
        self.assertIs(
            session._session.get_component("data_loader"),
            _SHARED_BOTOCORE_LOADER,
        )

    def test_two_sessions_share_loader(self):
        s1 = _make_boto3_session(
            access_key_id=None, secret_key=None, session_token=None, region=None
        )
        s2 = _make_boto3_session(
            access_key_id="k", secret_key="s", session_token=None, region="us-east-1"
        )
        self.assertIs(
            s1._session.get_component("data_loader"),
            s2._session.get_component("data_loader"),
        )

    def test_lock_protects_shared_loader_load_service_model(self):
        # `_S3_BUILD_LOCK` exists to serialize first-miss reads through the
        # shared botocore Loader. If a future boto3 refactor bypassed the
        # Loader during session.resource/client construction, the lock would
        # guard nothing. Spy `load_service_model` and confirm it's called for
        # the `s3` service during `S3CloudStorage.__init__`.
        with patch.object(
            cloud_provider._SHARED_BOTOCORE_LOADER,
            "load_service_model",
            wraps=cloud_provider._SHARED_BOTOCORE_LOADER.load_service_model,
        ) as spy:
            S3CloudStorage(bucket="test-bucket")

        self.assertTrue(spy.called, "shared Loader.load_service_model was not exercised")
        s3_calls = [c for c in spy.call_args_list if "s3" in c.args or c.kwargs.get("service_name") == "s3"]
        self.assertTrue(
            s3_calls,
            f"shared Loader was used but not for the s3 service: {spy.call_args_list}",
        )


class TestCredentialResolverHardened(unittest.TestCase):
    """Anonymous CS uses `Config(signature_version=UNSIGNED)`, which makes
    `botocore.session.create_client` skip credential resolution entirely
    (see the `signature_version is UNSIGNED` branch in
    botocore/session.py). Signed CS pass explicit credentials via the
    `boto3.Session(...)` kwargs, which boto3 stores directly on the session
    via `set_credentials(...)` — `get_credentials()` returns them without
    invoking the resolver chain. Either way the env/file/IMDS chain never
    runs in practice."""

    def test_anonymous_session_ignores_ambient_aws_env_vars(self):
        # End-to-end behavioral guarantee: even with sentinel AWS_* env vars
        # set (which the default credential chain would happily pick up), an
        # anonymous S3CloudStorage's client must end up with UNSIGNED signing
        # and no credentials attached. If anything ever routed an anonymous
        # client through the credential chain, this test catches it.
        sentinel_env = {
            "AWS_ACCESS_KEY_ID": "SENTINEL-SHOULD-NOT-LEAK",
            "AWS_SECRET_ACCESS_KEY": "SENTINEL-SHOULD-NOT-LEAK",
            "AWS_SESSION_TOKEN": "SENTINEL-SHOULD-NOT-LEAK",
        }
        with patch.dict(os.environ, sentinel_env):
            s3 = S3CloudStorage(bucket="test-bucket")
        self.assertIs(s3._client._request_signer.signature_version, UNSIGNED)
        self.assertIsNone(s3._client._request_signer._credentials)

    def test_explicit_credentials_attached_to_signer(self):
        # boto3.Session(aws_access_key_id=..., ...) stores credentials on the
        # session via set_credentials, so they reach the client's request
        # signer directly — without going through the resolver chain.
        access_key = "AKIA-EXPLICIT-KEY"
        secret_key = "explicit-secret-value"
        s3 = S3CloudStorage(
            bucket="test-bucket",
            access_key_id=access_key,
            secret_key=secret_key,
            region="us-east-1",
        )
        signer = s3._client._request_signer
        self.assertIsNotNone(signer._credentials)
        self.assertEqual(signer._credentials.access_key, access_key)
        self.assertEqual(signer._credentials.secret_key, secret_key)

        # Production contract: signed CS must not pick up UNSIGNED. The exact
        # signature_version (currently s3v4) is a boto3 default and not part
        # of our contract.
        self.assertIsNot(signer.signature_version, UNSIGNED)

    def test_anonymous_clients_use_unsigned(self):
        # Anonymous CS must use Config(signature_version=UNSIGNED) on both
        # the main client and the status-check client, replacing the legacy
        # disable_signing event handler trick. UNSIGNED makes botocore skip
        # credential resolution entirely in `create_client`, so anonymous
        # requests never look up credentials.
        s3 = S3CloudStorage(bucket="test-bucket")
        self.assertIs(s3._client._request_signer.signature_version, UNSIGNED)
        self.assertIs(s3._status_client._request_signer.signature_version, UNSIGNED)


class TestFrozenSessionEvents(unittest.TestCase):
    """After both clients are built, the session-level emitter must reject
    further register/unregister calls. Per-client emitters stay mutable."""

    def _frozen_session_events(self):
        session = _make_boto3_session(
            access_key_id=None, secret_key=None, session_token=None, region=None
        )
        session._session.register_component(
            "event_emitter",
            _FrozenEventEmitter(session._session.get_component("event_emitter")),
        )
        return session.events

    def test_register_raises_after_freeze(self):
        events = self._frozen_session_events()
        for method in ("register", "register_first", "register_last", "unregister"):
            with self.subTest(method=method):
                with self.assertRaisesRegex(RuntimeError, "Refusing to register"):
                    getattr(events, method)("foo", lambda **kw: None)

    def test_emit_still_works_after_freeze(self):
        events = self._frozen_session_events()
        # emit must delegate without error and return whatever the wrapped emitter returns.
        result = events.emit("no-such-event-anywhere")
        self.assertIsInstance(result, list)

    def test_per_client_events_remain_mutable(self):
        s3 = S3CloudStorage(bucket="test-bucket")
        # If register raised, we'd never reach the next line; successful
        # registration is the assertion.
        s3._client.meta.events.register("before-call.s3.HeadObject", lambda **kw: None)


class TestCloudStorageFieldsCoverage(unittest.TestCase):
    """If a CloudStorage field is added/renamed or the cached-build function
    grows a new input, force a reviewer to confirm the cache key still
    covers everything that affects S3/Azure/GCS client construction."""

    # Fields that, if changed on the model, must invalidate a cached client
    # (they participate in the cache key of `_build_storage_instance`).
    SESSION_AFFECTING_FIELDS = frozenset(
        {
            "provider_type",
            "resource",
            "credentials_type",
            "credentials",
            "specific_attributes",
        }
    )

    # Fields that exist on the model but are irrelevant to session
    # construction (display labels, owner, timestamps, FK back-refs, etc.).
    NON_SESSION_AFFECTING_FIELDS = frozenset(
        {
            "id",
            "created_date",
            "updated_date",
            "display_name",
            "owner",
            "description",
            "organization",
            "data",
            "manifest",
        }
    )

    def test_cloud_storage_field_set_is_stable(self):
        actual = {f.name for f in CloudStorage._meta.get_fields()}
        expected = self.SESSION_AFFECTING_FIELDS | self.NON_SESSION_AFFECTING_FIELDS
        self.assertEqual(
            actual,
            expected,
            (
                f"CloudStorage model fields changed: added={actual - expected}, "
                f"removed={expected - actual}. Review whether the new field "
                f"affects S3/Azure/GCS client construction in "
                f"cvat.apps.engine.cloud_provider._build_storage_instance; "
                f"then update SESSION_AFFECTING_FIELDS / "
                f"NON_SESSION_AFFECTING_FIELDS and, if it does, the cache key "
                f"in db_storage_to_storage_instance accordingly."
            ),
        )

    def test_build_storage_instance_signature_is_stable(self):
        params = set(inspect.signature(_build_storage_instance).parameters)
        expected = {
            "cloud_provider",
            "resource",
            "credentials_type",
            "credentials_value",
            "specific_attributes_str",
        }
        self.assertEqual(
            params,
            expected,
            (
                "_build_storage_instance signature changed. The parameter set IS "
                "the cache key; review whether every parameter affects client "
                "construction, and update db_storage_to_storage_instance to "
                "thread the new value through."
            ),
        )


def _reset_cs_client_instance_cache():
    _build_storage_instance_cached.cache_clear()


class TestS3CloudStorageClientCaching(unittest.TestCase):
    def setUp(self):
        _reset_cs_client_instance_cache()

    def test_same_cs_returns_cached_instance(self):
        cloud_storage = _make_cloud_storage()
        self.assertIs(
            db_storage_to_storage_instance(cloud_storage),
            db_storage_to_storage_instance(cloud_storage),
        )

    def test_field_change_invalidates(self):
        cases = [
            ("resource", {"resource": "bucket-1"}, {"resource": "bucket-2"}),
            (
                "credentials",
                {"credentials_type": "KEY_SECRET_KEY_PAIR", "credentials": "key1 secret1"},
                {"credentials_type": "KEY_SECRET_KEY_PAIR", "credentials": "key2 secret2"},
            ),
            (
                "specific_attributes",
                {"specific_attributes": "region=us-east-1"},
                {"specific_attributes": "region=eu-west-1"},
            ),
        ]
        for label, kwargs_a, kwargs_b in cases:
            with self.subTest(field=label):
                _reset_cs_client_instance_cache()
                self.assertIsNot(
                    db_storage_to_storage_instance(_make_cloud_storage(**kwargs_a)),
                    db_storage_to_storage_instance(_make_cloud_storage(**kwargs_b)),
                )

    @override_settings(CLOUD_STORAGE_INSTANCE_CACHE_SIZE=1)
    def test_cache_size_setting_applies(self):
        client1 = db_storage_to_storage_instance(_make_cloud_storage(resource="bucket-1"))

        db_storage_to_storage_instance(_make_cloud_storage(resource="bucket-2"))

        client2 = db_storage_to_storage_instance(_make_cloud_storage(resource="bucket-1"))
        self.assertIsNot(client1, client2)

    def test_cache_ttl_setting_applies(self):
        # The factory must wire the configured TTL into the underlying
        # TTLCache, and entries that pass that horizon must be evicted on the
        # next access. Advance the cache's timer past the TTL via
        # `cache.expire(time=...)` instead of sleeping, so the test is
        # deterministic under load.
        from django.conf import settings as dj_settings

        cache = _build_storage_instance_cached().cache
        self.assertEqual(cache.ttl, dj_settings.CLOUD_STORAGE_INSTANCE_CACHE_TTL)

        cloud_storage = _make_cloud_storage()
        client1 = db_storage_to_storage_instance(cloud_storage)
        cache.expire(time=time.monotonic() + cache.ttl + 1)
        client2 = db_storage_to_storage_instance(cloud_storage)
        self.assertIsNot(client1, client2)

    def test_protected_by_build_lock(self):
        # Production call path must actually go through `_S3_BUILD_LOCK`, not
        # just have a lock object available.
        cloud_storage = _make_cloud_storage()
        fake_lock = MagicMock()
        fake_lock.__enter__ = MagicMock(return_value=None)
        fake_lock.__exit__ = MagicMock(return_value=None)
        with patch.object(cloud_provider, "_S3_BUILD_LOCK", fake_lock):
            db_storage_to_storage_instance(cloud_storage)
        fake_lock.__enter__.assert_called()
