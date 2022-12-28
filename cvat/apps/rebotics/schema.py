from drf_spectacular.extensions import OpenApiAuthenticationExtension


class RetailerAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = 'cvat.apps.rebotics.authentication.RetailerAuthentication'
    name = ['retailerCodename', 'retailerSecretKey']
    priority = 0

    def get_security_definition(self, auto_schema):
        return [
            {
                'type': 'apiKey',
                'in': 'header',
                'name': 'X-Retailer-Codename',
                'description': 'Retailer codename as set in Rebotics admin.'
            },
            {
                'type': 'apiKey',
                'in': 'header',
                'name': 'X-Retailer-Secret-Key',
                'description': 'Retailer secret key as set in Rebotics admin.'
            },
        ]
