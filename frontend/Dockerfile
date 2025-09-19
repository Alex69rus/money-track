FROM node:18-alpine AS build

# Accept build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_AI_WEBHOOK_URL

# Set environment variables for React build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_AI_WEBHOOK_URL=$REACT_APP_AI_WEBHOOK_URL

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]