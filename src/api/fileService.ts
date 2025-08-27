import { BASE_URL } from '../config';
import { getAuthHeader } from './client';
import * as FileSystem from 'expo-file-system';

export interface FileUploadResponse {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
}

export const uploadFile = async (fileUri: string): Promise<FileUploadResponse> => {
  try {
    // Read image as base64 and send JSON payload as backend expects
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
    const filename = 'image.jpg';
    const contentType = 'image/jpeg';

    const auth = await getAuthHeader();
    const response = await fetch(`${BASE_URL}/api/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth || {}),
      },
      body: JSON.stringify({
        data: `data:${contentType};base64,${base64}`,
        filename,
        contentType,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('Failed to upload file');
  }
};

export const getFileUrl = (fileId: string): string => {
  return `${BASE_URL}/api/files/${fileId}`;
};

export const downloadFile = async (fileId: string): Promise<Blob> => {
  try {
    const auth = await getAuthHeader();
    const response = await fetch(`${BASE_URL}/api/files/${fileId}`, {
      headers: {
        ...(auth || {}),
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error('File download error:', error);
    throw new Error('Failed to download file');
  }
};
