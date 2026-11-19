# iUEP Connect (Integrated University E-Portal)

iUEP Connect is an integrated student portal designed to streamline university services. It offers students a seamless way to request and preview their digital IDs, track their academic grades, and stay updated with the latest university announcements.

## Tech Stack

- **Backend:** Java Spring Boot (Spring Web, Spring Data JPA, Spring Security, WebSocket)
- **Database:** SQLite
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Integrations:** 
  - **Apify:** Facebook Posts Scraper for university news feeds
  - **SMTP (Spring Mail):** OTP and email verification (Gmail by default, configurable)

## Key Features

- **Student Dashboard:** View real-time updates and news scraped directly from relevant university Facebook pages.
- **Grades Portal:** Securely view and track academic progress across different semesters.
- **ID Generation:** Digital ID card preview and production request system using dynamic SVGs.
- **Admin Panel:** Administrative access to review ID production requests and audit history.

## Getting Started

### Prerequisites
- Java 21 or higher
- Maven

### Running the Application

**Windows quick start:** double-click `start.bat` to launch the backend and open the site, and `stop.bat` to shut it down. Optional secrets (`APIFY_TOKEN`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `JWT_SECRET`, `PORT`) can go in a `.env` file in the project root as `KEY=VALUE` lines.

**Email (SMTP):** OTP emails are sent over SMTP. Defaults point at Gmail (`smtp.gmail.com:587`, STARTTLS), so set `SMTP_USERNAME` to your Gmail address and `SMTP_PASSWORD` to a Gmail [App Password](https://myaccount.google.com/apppasswords). Other settings: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and for implicit SSL on port 465 `SMTP_SSL=true` + `SMTP_STARTTLS=false`. If `SMTP_USERNAME` is unset, no email is sent and the OTP is only written to the server log (handy for local dev).

> **Hosting note:** some hosts block outbound SMTP (Render's free tier does, which is why this project previously moved to an HTTP email API). If you deploy there, use a paid instance or switch back to an HTTP provider.

**Manual start:**

1. Clone the repository and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Run the application using the Maven wrapper:
   ```bash
   ./mvnw spring-boot:run
   ```
   *(For Windows: `.\mvnw.cmd spring-boot:run`)*

3. The application will start on `http://localhost:3000`.

### Deployment

This application is configured for deployment on **Render** using Docker. The `render.yaml` file defines the Web Service configuration.

## Demo Credentials & Seeding

> **Note on Data Seeding & Scraping:** 
> There are only **4 sample students** (all BSIT 3-E) seeded in the database, which represent the developers of this project. Their subjects follow the real BSIT curriculum and their grades are randomly generated. You can use their credentials as examples for creating an account. Generating accounts using real student IDs isn't possible yet because we do not currently have an implemented ETL pipeline to the university's central system.
> 
> **Apify Scraping Service:** The Facebook posts scraper is currently **enabled** (`SCRAPER_ENABLED = true` in [`backend/src/main/java/com/iuep/service/ScraperService.java`](backend/src/main/java/com/iuep/service/ScraperService.java)). It also needs an `APIFY_TOKEN` (put it in a git-ignored `.env` file next to `start.bat`). The first scrape of each page seeds the latest 5 posts; after that it only fetches posts newer than the newest one stored (checked daily, failures retried after 15 minutes). Set the flag back to `false` to save Apify credits.

### Seeded Student Accounts
The following students are pre-loaded in the database. You can use their Student ID and birthday to simulate a full signup flow on the live site. You can use any email address that you have access to receive OTP codes.

> **How to simulate a signup:**
> 1. Go to the **Sign Up** page and enter a student's **Student ID** from the table below.
> 2. The system will verify the ID exists, then ask for the student's **birthday** as identity confirmation.
> 3. After passing verification, enter an **email address** to receive an OTP.
> 4. Complete the OTP verification and set a new username and password.

| Student ID | Full Name | Birthday |
| :--- | :--- | :--- |
| `240475` | Jules Ian Cajandab Tomacas | June 8, 2006 |
| `235828` | Kent Jeanne Saradogan De Leon | November 21, 2000 |
| `244556` | Keniel Drew Dimaculangan De Asis | December 20, 2005 |
| `244530` | Jovan Pabia Atencio | February 5, 2006 |

### Admin Access
For administrative access, sample credentials have been pre-configured:
- **Username:** `admin`
- **Password:** `admin123`

*These credentials can be configured later in the dashboard and are provided solely for demo purposes.*
