extras = [
    """# Install rebotics requirements
COPY rebotics/requirements.txt /tmp/requirements/rebotics.txt
RUN python3 -m pip install --no-cache-dir -r /tmp/requirements/rebotics.txt

""",
    """# Install rebotics requirements
RUN apt-get update && \\
    apt-get --no-install-recommends install -yq nginx && \\
    rm -rf /var/lib/apt/lists/*

""",
    """# Install UI and setup nginx proxy
COPY --from=cvat-ui --chown=${USER} /tmp/cvat-ui/dist ${HOME}/static
COPY --chown=${USER} rebotics/supervisord.conf ${HOME}/supervisord/all.conf
COPY rebotics/nginx_proxy.conf /etc/nginx/conf.d/default.conf
RUN sed -i "s#\${HOME}#${HOME}#g" /etc/nginx/conf.d/default.conf && \\
    sed -i "s#pid /run#pid ${HOME}#" /etc/nginx/nginx.conf && \\
    ln -sf /dev/stdout /var/log/nginx/access.log && \\
    ln -sf /dev/stderr /var/log/nginx/error.log && \\
    chown -R ${USER} /var/lib/nginx /var/log/nginx
RUN rm /etc/nginx/sites-enabled/default

# Add version file
COPY --chown=${USER} VERSION ${HOME}/static/version

""",
]


def insert_into_string(string: str, at: str, what: str, after=False):
    parts = string.split(at)
    if len(parts) != 2:
        raise ValueError('Ambiguous split or empty string.')
    if after:
        return parts[0] + at + what + parts[1]
    return parts[0] + what + at + parts[1]


def make_dockerfile(dockerfile='Dockerfile', dockerfile_ui='Dockerfile.ui', output='rebotics/Dockerfile'):
    """
    Combines CVAT's Dockerfile and Dockerfile.ui into our single Dockerfile with extra rebotics' requirements.
    """
    with open(dockerfile) as f:
        dockerfile_content = f.read()

    with open(dockerfile_ui) as f:
        dockerfile_ui_content = f.read()

    parts = dockerfile_content.split('FROM')
    if len(parts) != 3:
        raise ValueError('Original Dockerfile structure had changed.'
                         ' Please, check it and update the script accordingly.')

    base_image = 'FROM' + parts[1]
    main_image = 'FROM' + parts[2]

    parts = dockerfile_ui_content.split('FROM')
    if len(parts) != 3:
        raise ValueError('Original Dockerfile.ui had changed.'
                         ' Please, review it and update the script accordingly.')

    base_ui_image = 'FROM' + parts[1]

    base_image += extras[0]
    base_image = base_image.replace('\n\n\n', '\n\n')

    main_image = insert_into_string(main_image, '# Add a non-root user', extras[1])
    main_image = insert_into_string(main_image, "# RUN all commands below as 'django' user", extras[2])

    dockerfile_content = base_image + base_ui_image + main_image

    with open(output, 'w') as f:
        f.write(dockerfile_content)

    print('Done')


if __name__ == '__main__':
    make_dockerfile()
