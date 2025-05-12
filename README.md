<p align="center">
  <img src="/site/content/en/images/cvat-readme-gif.gif" alt="CVAT Platform" width="100%" max-width="800px">
</p>

# Digital Sense Computer Vision Annotation Tool (DS-CVAT)




## Installation

(https://docs.cvat.ai/docs/administration/basics/installation/)

Pre-requisites:  

- Docker
- Google Chrome
1. `git clone https://github.com/cvat-ai/cvat`
2. `cd cvat`
3. Creo archivo **.env** **que va a definir la variable de entorno con la IP del servidor, este archivo se corre cada vez que se levanta el Docker de CVAT, segurando que esa variable de estado siempre esté bien definida:
    
    `nano .env`
    
    pego:    *CVAT_HOST=IP-ADDRESS*
    
4. En el archivo **docker-compose.yml** cambiar el puerto de 8080 al deseado:
    
    ```
    services:
      traefik:
        ...
        ...
        ports:
          - <YOUR_WEB_PORTAL_PORT>:8080
          - 8090:8090
    ```
    
    Es importante acá saber que por seguridad, el <YOUR_WEB_PORTAL_PORT> que elijas de manera random en un servidor, no va a estar abierto.
    
    4.a. Pedirle al tío que te habilite ese puerto que vos elegiste para que puedas entrar
    
5. Hasta acá es la instalación básica que se puede levantar levantando los contenedores, buildeando porque hicimos cambios en el docker-compose. Hay dos opciones:
    1. Para buildear CVAT pelado sin las AI tools:
        
        `docker compose up -d --build`
        
    2. Para para levantar cvat con accesso a las auto-labeling tools, hay que hacer el compose de esta manera:
        
        `docker compose -f docker-compose.yml -f components/serverless/docker-compose.serverless.yml up -d --build`
        
        Si ya se buildeó con el comando (a.), para luego rebuildear con las AI tools hay que correr antes un: `docker compose down` 
        
    
6. Una vez que se corre el comando para levantar el contenedor CVAT estará disponible en la dirección: 
    
    <*IP-ADDRESS*>*:*<YOUR_WEB_PORTAL_PORT>
    
7. Crear el usuario que será el manager de la aplicación:
    
    `docker exec -it cvat_server bash -ic 'python3 ~/manage.py createsuperuser'`
    
    Pedirá ponerle nombre y contraseña al usuario, con las que luego se ingresará a la plataforma en la dirección indicada en el paso (6.)

## Usar AI tools

Ahora, con el comando 5.b. solo buildeamos con las capacidades de tener las AI tools en el Docker pero aún no tenemos nada, estos son los pasos a seguir para eso hay que tener Nuclio. Si lo estás instalando en un servidor donde ya hay un cvat existente, ya va a tener esto, sino, entonces:

Instalar Nuclio:

1. `wget https://github.com/nuclio/nuclio/releases/download/1.13.0/nuctl-1.13.0-linux-amd64`
2. Pedirle al tío o a Mati que tire un sudo:
    1. `pwd`
    2. pasarle el path al tío o a Mati
    3. que corran desde él los comandos:
    `sudo chmod +x nuctl-1.13.0-linux-amd64`
        
        `sudo ln -sf $(pwd)/nuctl-1.13.0-linux-amd64 /usr/local/bin/nuctl`
        

Una vez que está nuclio instalado ya se pueden activar las funciones de auto etiquetado que vienen por defecto de CVAT como yolov3, con el comando:

`./serverless/deploy_cpu.sh serverless/openvino/omz/public/yolo-v3-tf`

Lo mismo va a ser para cualquier tool que tengas, cambiando el path a donde está la carpeta /nuclio de esa tool. Por ejemplo, si el repo que te forkeaste es el de DSense que ya tiene Uflow implementado, entonces corriendo el comando:

`./serverless/deploy_cpu.sh serverless/pytorch/anomalib/uflow/`

Se activa la herramienta de Uflow en cvat para autolabeling.

→ Importante:

Cada una de estas funciones se crea en un puerto, ese es el puerto del servidor con el cual se va a comunicar la aplicación para hacer la inferencia, por lo que el puerto también debe estar habilitado por el tío:

1. Uso comando para mirar las funciones de nuclio que están corriendo y en qué puerto:
    
    `nuctl get functions`
    
2. Le pido al tío que abra ese puerto

## Crear tu propia AI TOOL

Documentación: https://www.notion.so/Crear-tu-propia-AI-tool-1f14e1a6696b806182c5cb61559c3280

