#!/usr/bin/env sh

chown -R www-data:www-data var
php -d memory_limit=256M bin/console cache:clear
chown -R www-data:www-data var

apache2-foreground
