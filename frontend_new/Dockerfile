FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./
RUN npm run build

ARG BUILD_SHA=unknown
RUN printf '{"revision":"%s"}\n' "$BUILD_SHA" > dist/version.json

FROM nginx:1.27-alpine AS runtime

COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/version.json || exit 1
