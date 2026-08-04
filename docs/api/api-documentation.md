# API Documentation

This document provides comprehensive API documentation for the Plumbing JMS system.

## Overview

The Plumbing JMS API provides RESTful endpoints for managing jobs, customers, materials, users, and other aspects of the plumbing job management system.

## Authentication

All API endpoints require authentication via Supabase JWT tokens. The token should be included in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Base URL

```
/api
```

## Endpoints

### Jobs

#### GET /api/jobs
Retrieve a list of jobs with optional filtering.

Query Parameters:
- `status`: Filter by job status
- `technicianId`: Filter by assigned technician (for technicians only)

Response:
```json
{
  "jobs": [
    {
      "id": "string",
      "job_number": "string",
      "customer_id": "string",
      "description": "string",
      "status": "string",
      "admin_hourly_rate": "number",
      "created_at": "string",
      "updated_at": "string"
    }
  ]
}
```

#### POST /api/jobs
Create a new job (Owner only).

Request Body:
```json
{
  "customer_id": "string",
  "description": "string",
  "admin_hourly_rate": "number",
  "admin_notes": "string (optional)",
  "assigned_to": "string (optional)"
}
```

Response:
```json
{
  "job": {
    "id": "string",
    "job_number": "string",
    "customer_id": "string",
    "description": "string",
    "status": "string",
    "admin_hourly_rate": "number",
    "admin_notes": "string",
    "assigned_to": "string",
    "created_by": "string",
    "created_at": "string",
    "updated_at": "string"
  }
}
```

#### PATCH /api/jobs
Update an existing job (Owner only).

Request Body:
```json
{
  "job_id": "string",
  "status": "string (optional)",
  "description": "string (optional)",
  "admin_hourly_rate": "number (optional)",
  "admin_notes": "string (optional)",
  "assigned_to": "string (optional)"
}
```

Response:
```json
{
  "job": {
    // Updated job object
  }
}
```

#### DELETE /api/jobs
Delete a job (Owner only).

Query Parameters:
- `id`: Job ID to delete

Response:
```json
{
  "success": true
}
```

### Customers

#### GET /api/customers
Retrieve a list of customers.

#### POST /api/customers
Create a new customer.

#### PATCH /api/customers
Update an existing customer.

#### DELETE /api/customers
Delete a customer.

### Materials

#### GET /api/materials
Retrieve a list of materials/inventory.

#### POST /api/materials
Add new material inventory.

#### PATCH /api/materials
Update material inventory levels.

#### DELETE /api/materials
Remove material inventory.

### Users

#### GET /api/users
Retrieve a list of users (Owner only).

#### POST /api/users
Create a new user (Owner only).

#### PATCH /api/users
Update user information (Owner/Admin only).

#### DELETE /api/users
Delete a user (Owner only).

### Quotes

#### POST /api/quotes
Create a new quote.

#### GET /api/quotes
Retrieve quotes.

#### PATCH /api/quotes
Update a quote.

#### DELETE /api/quotes
Delete a quote.

### Invoices

#### GET /api/invoices
Retrieve invoices.

#### POST /api/invoices
Create an invoice from a completed job.

#### PATCH /api/invoices
Update invoice status.

#### DELETE /api/invoices
Delete an invoice.

### Reports

#### GET /api/reports
Generate various reports (revenue, job completion, etc.).

### Webhooks

#### POST /api/webhook/supabase
Handle Supabase webhook events.

### Health Check

#### GET /api/health
Check API health status.

Response:
```json
{
  "status": "healthy",
  "timestamp": "string",
  "version": "string"
}
```

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message description"
}
```

Common HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 500: Internal Server Error

## Rate Limiting

API endpoints are rate-limited to prevent abuse. Limits are:
- 100 requests per 15 minutes per IP address for unauthenticated requests
- 1000 requests per 15 minutes per user for authenticated requests

Exceeding these limits will result in a 429 (Too Many Requests) response.

## Versioning

API versioning is implemented via URL path. Current version: v1 (implied by /api/ prefix).

## Changelog

See CHANGELOG.md for detailed version history.

## Support

For API-related questions or issues, please contact the development team.