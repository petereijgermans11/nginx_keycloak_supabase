FROM openresty/openresty:1.21.4.3-alpine

# Installeer dependencies voor lua-resty modules
RUN apk add --no-cache \
    curl \
    git \
    perl \
    openssl \
    openssl-dev \
    gcc \
    make \
    musl-dev \
    pcre-dev \
    zlib-dev

# Installeer lua-resty-openidc en dependencies
RUN /usr/local/openresty/bin/opm get zmartzone/lua-resty-openidc

# BELANGRIJKE FIX: Installeer lua-resty-openssl met de juiste versie
RUN cd /tmp && \
    git clone https://github.com/fffonion/lua-resty-openssl.git && \
    cd lua-resty-openssl && \
    git checkout 0.8.25 && \
    make && \
    mkdir -p /usr/local/openresty/site/lualib/resty && \
    cp -r lib/resty/* /usr/local/openresty/site/lualib/resty/ && \
    cd / && \
    rm -rf /tmp/lua-resty-openssl

# Installeer lua-resty-session (expliciete versie voor compatibility)
RUN /usr/local/openresty/bin/opm get bungle/lua-resty-session=4.0.5

# Installeer overige dependencies
# lua-resty-string en lua-resty-http zijn al geïnstalleerd door andere dependencies
RUN /usr/local/openresty/bin/opm get ledgetech/lua-resty-http || true

# Copy NGINX configuratie en custom Lua modules
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY oidc_helper.lua /usr/local/openresty/nginx/oidc_helper.lua

EXPOSE 8080

CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]

