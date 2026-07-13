export const ERROR_MESSAGES = {
  getNotFoundMessage(entityName: string) {
    return `${entityName} Not Found`;
  },

  getUniqueConstraintMessage(entityName: string, prop: string | string[]) {
    if (typeof prop === 'string') {
      return `${entityName} with this ${prop} already exists`;
    }
    return `${entityName} with these ${prop.join(', ')} already exists`;
  },
} as const;
