# Copyright 2022 nmanovic
# 
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

class ServerProxy:
    def __init__(self, server_addr, auth):
        self.auth = auth
        self.server_addr = server_addr


def create(server_addr, auth):
    return ServerProxy(server_addr, auth)