# Copyright (C) 2020-2022 Intel Corporation
#
# SPDX-License-Identifier: MIT


from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.conf import settings

class UserAgreementsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_agreements = settings.RESTRICTIONS['user_agreements']
        settings.RESTRICTIONS['user_agreements'] = [
            {
                'name': 'agreement_1',
                'display_text': 'some display text 1',
                'url': 'https://example.com',
                'required': True,
            },
            {
                'name': 'agreement_2',
                'display_text': 'some display text 2',
                'url': 'https://example2.com',
                'required': True,
            },
            {
                'name': 'agreement_3',
                'display_text': 'some display text 3',
                'url': 'https://example3.com',
                'required': False,
            },
        ]

    def tearDown(self):
        settings.RESTRICTIONS['user_agreements'] = self.user_agreements

    def _get_user_agreements(self):
        response = self.client.get('/api/restrictions/user-agreements')
        assert response.status_code == status.HTTP_200_OK
        for agreements in response.data:
            assert 'name' in agreements, agreements['name']
            assert 'displayText' in agreements
            assert 'required' in agreements
        return response.data

    def _register_user(self, data):
        response = self.client.post('/api/auth/register', data=data, format="json")
        return response


    def test_user_agreements(self):
        self._get_user_agreements()

    def test_register_user_with_required_confirmations(self):
        agreements = self._get_user_agreements()
        data = {
            'username': 'some_username1',
            'first_name': 'some first name 1',
            'last_name': 'some last name 1',
            'email': 'user1@example.com',
            'password1': 'FnvL4YdF24NAmnQ8',
            'password2': 'FnvL4YdF24NAmnQ8',
            'confirmations':[],
        }
        for agreement in agreements:
            if agreement['required']:
                data['confirmations'].append({
                    'name': agreement['name'],
                    'value': True,
                })
        response = self._register_user(data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_register_user_without_confirmations(self):
        data = {
            'username': 'some_username2',
            'first_name': 'some first name 2',
            'last_name': 'some last name 2',
            'email': 'user2@example.com',
            'password1': 'FnvL4YdF24NAmnQ8',
            'password2': 'FnvL4YdF24NAmnQ8',
            'confirmations':[],
        }

        response = self._register_user(data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_user_with_all_confirmations(self):
        agreements = self._get_user_agreements()
        data = {
            'username': 'some_username3',
            'first_name': 'some first name 3',
            'last_name': 'some last name 3',
            'email': 'user3@example.com',
            'password1': 'FnvL4YdF24NAmnQ8',
            'password2': 'FnvL4YdF24NAmnQ8',
            'confirmations':[],
        }

        for agreement in agreements:
            data['confirmations'].append({
                'name': agreement['name'],
                'value': True,
            })

        response = self._register_user(data)
        assert response.status_code == status.HTTP_201_CREATED
