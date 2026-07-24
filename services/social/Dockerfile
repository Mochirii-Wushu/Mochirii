FROM serversideup/php:8.5-fpm-nginx@sha256:185968e90401e65990a6f822225c46f1c79658e43bdf602f9cd13188f7af6295

LABEL org.opencontainers.image.source="https://github.com/Mochirii-Wushu/Mochirii"

# Set working directory
WORKDIR /var/www/html

# Switch to root to install packages
USER root

# Install system dependencies and PHP extensions
RUN apt-get update && apt-get install -y \
    ffmpeg \
    unzip \
    zip \
    jpegoptim \
    optipng \
    pngquant \
    gifsicle \
    libvips42 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions using the built-in helper
RUN install-php-extensions \
    bcmath \
    curl \
    exif \
    gd \
    imagick \
    intl \
    mbstring \
    xml \
    zip \
    pdo_mysql \
    redis \
    vips \
    ffi

# Copy application files
COPY --chown=www-data:www-data . /var/www/html

# Install fast, idempotent startup guards before Laravel bootstraps.
COPY --chmod=755 ./docker/entrypoint.d/ /etc/entrypoint.d/

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html \
    && find /var/www/html -type f -exec chmod 644 {} \; \
    && find /var/www/html -type d -exec chmod 755 {} \; \
    && chmod -R ug+rwx /var/www/html/storage /var/www/html/bootstrap/cache

# Install production composer dependencies and verify the final package manifest.
RUN composer install --no-ansi --no-interaction --no-dev --optimize-autoloader \
    && php scripts/check-production-composer-dependencies.php

# Switch back to www-data user
USER www-data

# Expose port 8080 (default for serversideup/php)
EXPOSE 8080
