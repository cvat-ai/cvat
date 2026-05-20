# Copyright (C) CVAT.ai Corporation
#
# SPDX-License-Identifier: MIT

import datetime
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
    updated_date_iso="2025-05-20T10:00:00+00:00",
):
    return CloudStorage(
        provider_type=provider_type,
        resource=resource,
        credentials_type=credentials_type,
        credentials=credentials,
        specific_attributes=specific_attributes,
        updated_date=datetime.datetime.fromisoformat(updated_date_iso),
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


class TestCredentialResolverHardened(unittest.TestCase):
    """No silent fall-through to env/file/IMDS. CloudStorage credentials must
    come from the DB row."""

    def test_session_credential_resolver_has_no_providers(self):
        # Default botocore resolver chains env vars -> ~/.aws/credentials ->
        # ~/.aws/config -> IMDS -> container metadata. Any of these would let
        # ambient host credentials bleed into a CloudStorage that should be
        # anonymous (or whose creds the row didn't supply). An empty provider
        # list proves the resolver was replaced, so `session.get_credentials()`
        # can never fall through to host-level secrets or stall on IMDS.
        session = _make_boto3_session(
            access_key_id=None, secret_key=None, session_token=None, region=None
        )
        resolver = session._session.get_component("credential_provider")
        self.assertEqual(resolver.providers, [])

    def test_anonymous_session_ignores_ambient_aws_env_vars(self):
        # Behavioral check that no chain provider actually fires: botocore's
        # EnvProvider is the first link in the default chain, so if our
        # resolver swap is dropped or bypassed, these sentinel env vars would
        # propagate into the session and get_credentials() would return them.
        # With the empty resolver, the call must return None.
        sentinel_env = {
            "AWS_ACCESS_KEY_ID": "SENTINEL-SHOULD-NOT-LEAK",
            "AWS_SECRET_ACCESS_KEY": "SENTINEL-SHOULD-NOT-LEAK",
            "AWS_SESSION_TOKEN": "SENTINEL-SHOULD-NOT-LEAK",
        }
        with patch.dict(os.environ, sentinel_env):
            session = _make_boto3_session(
                access_key_id=None,
                secret_key=None,
                session_token=None,
                region=None,
            )
            self.assertIsNone(session.get_credentials())

    def test_explicit_credentials_survive_resolver_swap(self):
        # boto3.Session(aws_access_key_id=..., ...) calls set_credentials
        # directly on the botocore session, which stores them outside the
        # resolver chain. Verify our resolver swap doesn't drop them.
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
        # disable_signing event handler trick. Together with the empty
        # resolver, this means anonymous requests never look up credentials.
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
            (
                "updated_date",
                {"updated_date_iso": "2025-01-01T00:00:00+00:00"},
                {"updated_date_iso": "2025-01-02T00:00:00+00:00"},
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
