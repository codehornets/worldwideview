FROM node:22-alpine

# Install build tools for native sqlite compilation
RUN apk add --no-cache python3 make g++ 

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .

EXPOSE 3001
CMD ["npm", "start"]
