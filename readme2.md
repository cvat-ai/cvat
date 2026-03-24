$ curl -H "Host: localhost" http://100.114.215.51:8082/api/server/about


• Для CVAT UI это настраивается в dev-прокси webpack’а.

  Где:

  - cvat/cvat-ui/webpack.config.js → devServer.proxy[].target берётся из --env API_URL=... (см. target: env && env.API_URL).
  - Важно: браузер не умеет посылать кастомный Host, поэтому ходить “напрямую” на http://100.114.215.51:8082 не выйдет, если бэкенд требует Host: loc
    alhost. Нужно ходить через dev-прокси.

  Я добавил поддержку принудительного Host для прокси:

  - cvat/cvat-ui/webpack.config.js:97 — если передать --env API_HOST=localhost, прокси будет ставить Host: localhost.

  Как запускать фронт так, чтобы он обращался к твоему бэкенду:

  Вариант 1 (из корня репозитория):

  cd /home/slava/storage/chess/cvat
  npm run start -- --env API_URL=http://100.114.215.51:8082 --env API_HOST=localhost

  Вариант 2 (из папки UI):

  cd /home/slava/storage/chess/cvat/cvat-ui
  npm run start -- --env API_URL=http://100.114.215.51:8082 --env API_HOST=localhost

  Если у тебя в package.json уже захардкожен --env API_URL=..., то добавленный в конце --env API_URL=... обычно переопределяет, но если вдруг не
  переопределит — скажи, я подправлю scripts.start, чтобы URL брался из переменной окружения.
