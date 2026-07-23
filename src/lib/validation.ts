import { z } from 'zod';

// Define the schema for job input validation
const jobInputSchema = z.object({
  admin_hourly_rate: z.number().nonnegative().optional(),
  // Add other fields as needed
  // For example:
  // customer_name: z.string().min(1),
  // job_description: z.string().min(1),
});

export function validateJobInput(data: any): string[] {
  try {
    // Attempt to parse the data with the schema
    jobInputSchema.parse(data);
    return []; // No errors
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return the error messages
      return error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    }
    // If it's not a Zod error, throw it
    throw error;
  }
}