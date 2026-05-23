# Stage 1: Build (not needed for this static project, but kept for extensibility)
# For pure static sites without a build step, we skip build stages and serve directly.

# Stage 2: Production
FROM nginx:1.27-alpine-slim

# Remove default nginx static assets to avoid conflicts
RUN rm -rf /usr/share/nginx/html/*

# Set working directory
WORKDIR /usr/share/nginx/html

# Copy only production static assets
COPY index.html .
COPY constants.js .
COPY pdf-handler.js .
COPY parser.js .
COPY renderer.js .
COPY heuristics.js .
COPY app.js .
COPY global-intelligence.js .

# Copy custom nginx configuration for SPA behavior
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Healthcheck to ensure nginx is serving traffic
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Run nginx in foreground so Docker can manage the process correctly
CMD ["nginx", "-g", "daemon off;"]
