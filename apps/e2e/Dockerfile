FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install @playwright/cli globally for step-by-step browser automation
RUN npm install -g @playwright/cli

# Install the chromium version required by @playwright/cli (differs from base image)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN /usr/lib/node_modules/@playwright/cli/node_modules/.bin/playwright install chromium

# Install x11vnc for viewing headed browser sessions
RUN apt-get update && apt-get install -y x11vnc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV DISPLAY=:99

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
