# Wilaya Portal

Wilaya Portal is an internal intranet platform for HR and administrative management for a Moroccan public administration.

## Overview

The application centralizes the main internal workflows:
- leave requests and approvals
- employee profiles
- events and comments
- public holidays calendar
- projects and audit logs
- role-based dashboards for employees, division chiefs, HR admins, and super admins

## Tech Stack

- Frontend: React 18, React Router, Axios, custom CSS
- Backend: Spring Boot 3.1, Java 17, Spring Data JPA, Spring Security
- Authentication: JWT Bearer tokens
- Database: PostgreSQL

## Project Structure

### Frontend
- `frontend/src/components`
- `frontend/src/pages`
- `frontend/src/services`
- `frontend/src/styles`

### Backend
- `backend/src/main/java/com/example/management/controller`
- `backend/src/main/java/com/example/management/service`
- `backend/src/main/java/com/example/management/repository`
- `backend/src/main/java/com/example/management/entity`
- `backend/src/main/java/com/example/management/security`

## Main Features

- login and secure authentication
- password change and account locking
- leave request workflow with multi-level approval
- PDF printing for leave requests
- employee management
- event management
- calendar with holidays and events
- audit logging

## Local Setup

### Prerequisites
- Java 17
- Node.js 18+
- Maven
- PostgreSQL

### Backend
1. Configure database and JWT settings in `backend/src/main/resources/application.properties`
2. Start the backend:
```powershell
cd backend
mvn spring-boot:run
```

### Frontend
1. Install dependencies:
```powershell
cd frontend
npm install
```
2. Start the frontend:
```powershell
npm start
```

## Database Model

Main tables used by the project:
- `users`
- `leave_requests`
- `events`
- `event_comments`
- `event_participants`
- `public_holidays`
- `platform_catalog_options`
- `audit_logs`
- `projects`



