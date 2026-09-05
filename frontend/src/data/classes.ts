import { apiClient } from '@/services/apiClient';

export interface ClassData {
  id: string;
  name: string;
  grade: string;
  section: string;
  academicYear: string;
  teacherId: string;
  schoolId: string;
  createdAt?: string;
}

export async function getClasses(): Promise<ClassData[]> {
  try {
    const data = await apiClient.get('/api/classes');
    if (data.classes) {
      return data.classes;
    }
    return [];
  } catch (error) {
    console.error('Failed to get classes:', error);
    return [];
  }
}

export async function createClass(classData: Partial<ClassData>): Promise<{ success: boolean; class?: ClassData; error?: any }> {
  try {
    const data = await apiClient.post('/api/classes', classData);
    if (data.success) {
      return { success: true, class: data.class };
    }
    return { success: false, error: data.error };
  } catch (error) {
    console.error('Failed to create class:', error);
    return { success: false, error };
  }
}
