import re

from django.http.request import validate_host, split_domain_port
from django.http.response import HttpResponseBadRequest
from django.conf import settings

from cvat.apps.engine.log import slogger


class SubnetCheckError(Exception):
    pass


def _parse_address(address):
    bits = ''
    for octet in address.split('.'):
        octet = int(octet)
        if octet < 0 or octet > 255:
            raise SubnetCheckError(f'Invalid address: {address}')
        bits += f'{octet:08b}'
    return bits


def _parse_subnet(subnet):
    net, mask = subnet.split('/')
    bits = _parse_address(net)

    mask = int(mask)
    if mask < 0 or mask > 32:
        raise SubnetCheckError(f'Invalid mask: {mask}')

    return bits, mask


def _validate_subnet(host, allowed_subnets):
    host = _parse_address(host)

    for bits, mask in allowed_subnets:
        if host[:mask] == bits[:mask] and host[mask:] <= '1' * (32 - mask):
            return True

    return False


def subnet_hosts_middleware(get_response):
    allowed_hosts = []
    allowed_subnets = []

    for host in settings.ALLOWED_SUBNETS:
        if re.match(r'^\d+.\d+.\d+.\d+/\d+$', host):
            allowed_subnets.append(_parse_subnet(host))
        else:
            allowed_hosts.append(host)

    def middleware(request):
        host = request.get_host()

        slogger.glob.info(f'Validating host: {host} in {allowed_hosts}, {allowed_subnets}')
        domain, port = split_domain_port(host)
        if validate_host(domain, allowed_hosts):
            return get_response(request)
        if re.match(r'^\d+.\d+.\d+.\d+/\d+$', domain) and _validate_subnet(domain, allowed_subnets):
            return get_response(request)
        return HttpResponseBadRequest(f'Invalid HTTP_HOST header: {host}.')

    return middleware
