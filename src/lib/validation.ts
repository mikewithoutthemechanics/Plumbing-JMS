export function validateJobInput(data: any): string[] {
  const errors: string[] = [];

  if (data.admin_hourly_rate !== undefined) {
    if (typeof data.admin_hourly_rate !== 'number' || isNaN(data.admin_hourly_rate) || data.admin_hourly_rate < 0) {
      errors.push('admin_hourly_rate must be a non-negative number');
    }
  }

  // Include other numeric validations as needed in the future

  return errors;
}
