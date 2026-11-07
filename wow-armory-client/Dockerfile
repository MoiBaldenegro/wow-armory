FROM node:20-alpine AS build

ARG VITE_SERVER_URI
ENV VITE_SERVER_URI=${VITE_SERVER_URI}

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
