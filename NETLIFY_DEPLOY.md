# Deploying to Netlify

This project has been configured to deploy on Netlify. Follow these steps to deploy your application:

## Prerequisites

- A Netlify account
- Git repository hosting (GitHub, GitLab, Bitbucket)

## Deployment Steps

1. Push your code to a Git repository
2. Log in to your Netlify account
3. Click "New site from Git" and select your repository
4. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `dist/public`
   - Functions directory: `dist/functions`

## Environment Variables

Make sure to add the following environment variables in Netlify's dashboard:

```
SESSION_SECRET
DATABASE_URL
PGDATABASE
PGHOST
PGPORT
PGUSER
PGPASSWORD
STRIPE_SECRET_KEY
```

## Troubleshooting

If you encounter any issues:

1. Check Netlify's function logs in the Netlify dashboard
2. Ensure all environment variables are correctly set
3. Verify your database is accessible from Netlify's servers

## Local Development

To run the application locally:

```
npm install
npm run dev
```

## Building for Production

To build the application for production without deploying:

```
npm run build
```

This will create the `dist` directory with both the client-side assets and serverless functions. 