# FinePrint - Legal Contract Summarizer

## Summary

FinePrint is a tool designed to help users quickly understand the key points of lengthy legal contracts by providing concise summaries. It leverages AWS services and modern web technologies to deliver an efficient and user-friendly experience. This project involves setting up an AWS environment, installing necessary dependencies, and running a development server to test the application locally.

## Setting Up the Project

### Prerequisites

- AWS account  with `AmplifyBackendDeployFullAccess` IAM role. For detailed account setup, follow the instructions [here](https://docs.amplify.aws/react/start/account-setup/).
- Node.js, npm, and AWS CLI installed

### First time setup

Deploy Application with AWS Amplify:

1. Sign in to the AWS Management console in a new browser window, and open the AWS Amplify console at https://console.aws.amazon.com/amplify/apps.

2. Choose Create new app. 

3. On the Start building with Amplify page, for Deploy your app, select GitHub, and select Next.

4. When prompted, authenticate with GitHub. You will be automatically redirected back to the Amplify console. Choose the repository and main branch you created earlier. Then select Next.

5. Leave the default build settings, and select Next.

6. Review the inputs selected, and choose Save and deploy.

### Steps

1. **Set AWS Local Environment Variables**
    - Configure AWS CLI with SSO if this is the first time:
      ```sh
      aws configure sso
      ```
    - or Login to AWS SSO:
      ```sh
      aws sso login
      ```

2. **Install Dependencies**
    ```sh
    npm install
    ```

3. **Start Amplify Sandbox**
    ```sh
    npx ampx sandbox
    ```

4. **Run the Development Server**
    - Open a new terminal instance:
      ```sh
      npm run dev
      ```

5. **Local Updates**
    - Use the provided link for local updates.

For detailed account setup, follow the instructions from step 3 in the [Amplify React setup guide](https://docs.amplify.aws/react/start/account-setup/).