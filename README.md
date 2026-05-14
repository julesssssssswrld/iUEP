# iUEP Connect (Integrated University E-Portal)

iUEP Connect is an integrated student portal designed to streamline university services. It offers students a seamless way to request and preview their digital IDs, track their academic grades, and stay updated with the latest university announcements.

## Tech Stack

- **Backend:** Java Spring Boot (Spring Web, Spring Data JPA, Spring Security, WebSocket)
- **Database:** SQLite
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Integrations:** 
  - **Apify:** Facebook Posts Scraper for university news feeds
  - **Brevo API:** Java HttpClient for HTTP-based OTP and email verification

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
> There are only **5 sample students** seeded in the database, which represent the developers of this project. You can use their credentials as examples for creating an account. Generating accounts using real student IDs isn't possible yet because we do not currently have an implemented ETL pipeline to the university's central system.
> 
> **Apify Scraping Service:** By default, the Facebook posts scraper is disabled to save Apify credits. To test the live feed, you can manually flip the `SCRAPER_ENABLED` variable to `true` inside [`backend/src/main/java/com/iuep/service/ScraperService.java`](backend/src/main/java/com/iuep/service/ScraperService.java).

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
| `240456` | Jose Manuel Morado Cardeño | September 23, 2006 |

### Admin Access
For administrative access, sample credentials have been pre-configured:
- **Username:** `admin`
- **Password:** `admin123`

*These credentials can be configured later in the dashboard and are provided solely for demo purposes.*
