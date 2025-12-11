FROM node:18

# 1. Google Chrome aur zaroori fonts install karein
# apt-key warning fix karne ke liye naya method use kiya hai
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Folder set karein
WORKDIR /usr/src/app

# 3. Dependencies copy karein
# NOTE: Yahan 'package.json' hona ZAROORI hai. Agar file nahi hogi toh build yahi fail hoga.
COPY package.json ./

# Puppeteer ko batayein ki Chromium download na kare
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# 4. Install karein
RUN npm install --no-optional

# 5. Baaki code copy karein
COPY . .

# 6. Port expose karein
EXPOSE 3000

# 7. Server start command
CMD [ "node", "server.js" ]
