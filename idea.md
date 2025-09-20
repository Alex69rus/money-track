# Money Track - Telegram Bot & Web App

## Project Overview

I'm going to implement a Telegram bot and a Telegram web app for personal money tracking.

This application will allow users to send SMS from the bank, which will be parsed by a Telegram bot and saved to the database. The Telegram web app (accessible through this Telegram bot) will display transactions, analytics for the user's transactions, and provide CRUD functionality for managing their transactions.

Also, the Telegram web app will have a dedicated screen for AI Chat: "Talk to your money," which will answer questions about users' transactions.

## Technology Stack Decisions

- **n8n workflows** for implementing a Telegram bot, which will parse SMS and answer questions about the user's money
- **React** for the front-end of the Telegram web app
- **PostgreSQL** for the database
- **Docker** for containerization

## Core Features

1. **SMS Processing**: Parse bank SMS messages through Telegram bot
2. **Transaction Management**: Full CRUD functionality for transactions
3. **Transaction Search**: Text-based search across transaction amount, note, tags, and category name
4. **Analytics Dashboard**: Display transaction analytics and insights
5. **AI Chat**: "Talk to your money" - AI-powered transaction queries
6. **Database Integration**: Store and manage all transaction data