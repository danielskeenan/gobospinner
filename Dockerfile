#######################################
# BASE IMAGE
#######################################
FROM php:8.0-apache as base

WORKDIR /var/www

# Production PHP.ini
RUN cp ${PHP_INI_DIR}/php.ini-production ${PHP_INI_DIR}/php.ini

# Install needed extensions
RUN apt-get update; \
    apt-get install -y --no-install-recommends unzip
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions ds gd intl opcache pcntl pdo_sqlite zip

# PHP configuration
COPY docker/app/entrypoint.sh /usr/local/bin/php-entrypoint
COPY docker/app/custom.ini $PHP_INI_DIR/conf.d/

#######################################
# COMPOSER
#######################################
FROM base as build

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

RUN rm -rf /var/www && mkdir /var/www
WORKDIR /var/www

COPY app/. /var/www

ARG APP_ENV=prod

# Composer symlinking causes issues when these are copied later
RUN set -xe \
    && if [ "$APP_ENV" = "prod" ]; then export ARGS="--no-dev"; fi \
    && COMPOSER_MIRROR_PATH_REPOS=1 composer install --prefer-dist --no-scripts --no-progress --no-interaction $ARGS

RUN composer dump-autoload --classmap-authoritative

#######################################
# APPLICATION
#######################################
FROM base as app

ARG APP_ENV=prod
ARG APP_DEBUG=0
ARG BUILD_NUMBER=debug

ENV APP_ENV $APP_ENV
ENV APP_DEBUG $APP_DEBUG
ENV SENTRY_DSN $SENTRY_DSN
ENV BUILD_NUMBER $BUILD_NUMBER

COPY --from=build /var/www/ /var/www/

RUN mkdir -p var/cache; \
    chown -R www-data:www-data var

# Web server configuration
COPY docker/app/app.apache2.conf ${APACHE_CONFDIR}/sites-available/app.conf
RUN a2ensite app; \
    a2dissite 000-default; \
    a2enmod rewrite

CMD ["/usr/local/bin/php-entrypoint"]
