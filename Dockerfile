# The game as a container image: the static build in dist/ (npm run build
# first) served by an unprivileged nginx on port 8080. It runs as any user
# with a read-only file system.
FROM nginxinc/nginx-unprivileged:alpine
COPY dist/ /usr/share/nginx/html/
