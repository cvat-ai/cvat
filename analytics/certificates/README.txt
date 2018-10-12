# Search Guard demo certificates

Thanks for using the Search Guard certificate generator web service!
This package contains generated TLS certificates to be used with Search Guard.

# Generated Artifacts                                                             

search-guard-certificates-<UUID>.tar.gz 
│
└─── client-certificates
│        Contains two client certificates named 'admin' and 'demouser'
│        The 'admin' certificate can be used with sgadmin and the REST API. 
│        The CN of this certificate is 'sgadmin'. The demouser certificate can be used 
│        for HTTPS client authentication. The CN of this certificate is 'demouser'
└─── node-certificates
│        Contains the certificates in jks, p12 and pem format to be used 
│        on your Elasticsearch nodes. You will find certificates for all 
│        hostnames you specified when submitting the form.
└─── root-ca
│        Contains the root CA certificate and private key in PEM format.
└─── config
│        Same as above, but for the signing CA
└─── truststore.jks
│        The truststore containing the certificate chain
│        of the root and signing CA, and the root certificate and private key in PEM format.
│        Can be used on all nodes.
└─── root-ca.pem
│        The root CA in PEM format.
│        Can be used on all nodes.
└─── chain-ca.pem
│        The certificate chain containg the root and signing CA in PEM format.
                                                             
                                                             
# Using PEM certificates                                       
                                                             
If you want to use certificates in PEM format, follow the steps here.
If you want to use keystore and truststore files, follow the steps in section 'Using keystore- and truststore files'.
                                                             
## Copying PEM certificates and private keys                                       

For each node:

* Copy the file 'root-ca.pem' to the config directory of your node
* Copy the file 'node-certificates/CN=[hostname].crtfull.pem' to the config directory of your node, where [hostname] is the hostname of your Elasticsearch node 
* Copy the file 'node-certificates/CN=[hostname].key.pem' to the config directory of your node, where [hostname] is the hostname of your Elasticsearch node 

## Configuring TLS on each node                                       

For each node, add the following lines to elasticsearch.yml.
Replace [hostname] with the hostname of the node, and [key password for this node]
with the private key password of the node. All settings and
passwords for each node are listed further down in this README.
                                                             
searchguard.ssl.transport.pemcert_filepath: CN=[hostname].crtfull.pem
searchguard.ssl.transport.pemkey_filepath: CN=[hostname].key.pem
searchguard.ssl.transport.pemkey_password: [private key password for this node]
searchguard.ssl.transport.pemtrustedcas_filepath: chain-ca.pem
searchguard.ssl.transport.enforce_hostname_verification: false
searchguard.ssl.http.enabled: true
searchguard.ssl.http.pemcert_filepath: CN=[hostname].crtfull.pem
searchguard.ssl.http.pemkey_filepath: CN=[hostname].key.pem
searchguard.ssl.http.pemkey_password: [private key password for this node]
searchguard.ssl.http.pemtrustedcas_filepath: chain-ca.pem
                                                             
searchguard.authcz.admin_dn:                                
  - CN=sgadmin  
                                                             
## Using sgadmin with PEM certificates                                      

To initialize the Search Guard configuration, you need to execute the sgadmin command line tool.
This can be done on any machine that has access to the transport port of your Elasticsearch cluster,
for example, a node in the cluster:

On the node where you want to execute sgadmin on:
* Copy the file 'root-ca.pem' to the directory 'plugins/search-guard-<version>/tools'
* Copy the file 'client-certificates/CN=sgadmin.crtfull.pem' to the directory 'plugins/search-guard-<version>/tools'
* Copy the file 'client-certificates/CN=sgadmin.key.pem' to the directory 'plugins/search-guard-<version>/tools'

Change to the 'plugins/search-guard-<version>/tools' and execute:

chmod 755 ./sgadmin.sh
./sgadmin.sh -cacert root-ca.pem -cert CN=sgadmin.crtfull.pem -key CN=sgadmin.key.pem -keypass d003819d0820d5e12376 -nhnv -icl -cd ../sgconfig/

If the node does not listen on default transport port 9300 and/or has a hostname other than localhost,
you can add:

-h,--hostname [host]        Elasticsearch host (default: localhost)
-p,--port [port]            Elasticsearch transport port (default: 9300)


# Using the keystore- and truststore file                                       
                                                             
If you want to use keystore and truststore files, follow the steps here.
If you want to use certificates in PEM format, follow the steps above in section 'Using PEM certificates'.
                                                             
## Copying the keystore and truststore files                                       

For each node:

* Copy the file 'truststore.jks' to the config directory of your node
* Copy the file 'node-certificates/CN=[hostname]-keystore.jks' to the config directory of your node, where [hostname] is the hostname of your Elasticsearch node 

## Configuring TLS on each node                                       

For each node, add the following lines to elasticsearch.yml.
Replace [hostname] with the hostname of the node, and [keystore password for this node]
with the keystore password of the keystore of the node. All settings and
passwords for each node are listed further down in this README.
                                                             
searchguard.ssl.transport.keystore_filepath: CN=[hostname]-keystore.jks
searchguard.ssl.transport.keystore_password: [keystore password for this node]
searchguard.ssl.transport.truststore_filepath: truststore.jks
searchguard.ssl.transport.truststore_password: d67ef282f3ac20405f37
searchguard.ssl.transport.enforce_hostname_verification: false
searchguard.ssl.http.enabled: true
searchguard.ssl.http.keystore_filepath: CN=[hostname]-keystore.jks
searchguard.ssl.http.keystore_password: [keystore password for this node]
searchguard.ssl.http.truststore_filepath: truststore.jks
searchguard.ssl.http.truststore_password: d67ef282f3ac20405f37
                                                             
searchguard.authcz.admin_dn:                                
  - CN=sgadmin  
                                                             
After that, start the node.
                                                             
## Using sgadmin with keystore- and truststore files                                      

To initialize the Search Guard configuration, you need to execute the sgadmin command line tool.
This can be done on any machine that has access to the transport port of your Elasticsearch cluster,
for example, a node in the cluster:

On the node where you want to execute sgadmin on:
* Copy the file 'truststore.jks' to the directory 'plugins/search-guard-<version>/tools'
* Copy the file 'client-certificates/CN=sgadmin-keystore.jks' to the directory 'plugins/search-guard-<version>/tools'

Change to the 'plugins/search-guard-<version>/tools' and execute:

chmod 755 ./sgadmin.sh
./sgadmin.sh -ts truststore.jks -tspass d67ef282f3ac20405f37 -ks CN=sgadmin-keystore.jks -kspass d003819d0820d5e12376 -nhnv -icl -cd ../sgconfig/

If the node does not listen on default transport port 9300 and/or has a hostname other than localhost,
you can add:

-h,--hostname [host]        Elasticsearch host (default: localhost)
-p,--port [port]            Elasticsearch transport port (default: 9300)


## Passwords                                       

### Common passwords                                      

Root CA password: df4e26843d61fcd868b162053e1291e52f426644                                       
Truststore password: d67ef282f3ac20405f37                               
Admin keystore and private key password: d003819d0820d5e12376                       
Demouser keystore and private key password: 7fae965b3d4276b951cd               

## Host/Node specific passwords                                       

Host: kibana                                                 
kibana keystore and private key password: 7799b53bb413ca051dab                           
kibana keystore: node-certificates/CN=kibana-keystore.jks     
kibana PEM certificate: node-certificates/CN=kibana.crtfull.pem     
kibana PEM private key: node-certificates/CN=kibana.key.pem     

Host: logstash                                                 
logstash keystore and private key password: 8ed0f086a6ce023abce6                           
logstash keystore: node-certificates/CN=logstash-keystore.jks     
logstash PEM certificate: node-certificates/CN=logstash.crtfull.pem     
logstash PEM private key: node-certificates/CN=logstash.key.pem     

Host: elasticsearch                                                 
elasticsearch keystore and private key password: 56daeaa2ba3c440c86a2                           
elasticsearch keystore: node-certificates/CN=elasticsearch-keystore.jks     
elasticsearch PEM certificate: node-certificates/CN=elasticsearch.crtfull.pem     
elasticsearch PEM private key: node-certificates/CN=elasticsearch.key.pem     
