# Aeonaxy Assignment

It is robust backend API for an e-learning platform. Theis API facilitates user registration, user profile management, course management (including CRUD operations for superadmin), and user enrollment functionalities. Additionally, in courses API, filtering and pagination has been implemented to enhance user experience. This project utilizes the free tier of neon.tech database for data storage and resend.com's free tier for handling email communications.

## Installation

Let's first setup our server
Make sure the current directory in the terminal should be /e-learning

Install the server dependencies

```bash
npm install
```

create your .env file in the current directory
and the file should look like this

```bash
PGHOST='<host>'
PGDATABASE='<database name>'
PGUSER='<user>'
PGPASSWORD='<password>'
ENDPOINT_ID='<endpoint>'

SECRET_KEY='<JWT SECRET KEY'

RESEND_API_KEY='<resend API key>'
```

after that start the server by executing this command in the server directory

```bash
npm dev
```