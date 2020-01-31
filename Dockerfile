FROM node:10.15.3-alpine

RUN apk add --update \
  lame \
  sox

# Setting working directory. All the path will be relative to WORKDIR
WORKDIR /usr/src/app

# Installing dependencies
COPY package*.json ./
RUN npm install --production

# Copying source files
COPY . .

# # Building app
# RUN npm run build

# Running the app
CMD [ "npm", "run", "start" ]