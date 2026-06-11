/**
 * Shared media props for EntityActivityPanel and EntityFilesPanel (PM).
 */
import { uploadFilesToStrapi } from '@webfudge/utils';
import strapiClient from './strapiClient';
import entityAttachmentService from './api/entityAttachmentService';

export const PM_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338');

export async function uploadChatFiles(files) {
  return uploadFilesToStrapi(files, { post: (path, body) => strapiClient.post(path, body) });
}

export const entityChatMediaProps = {
  apiBase: PM_API_BASE,
  uploadFilesFn: uploadChatFiles,
};

export const entityFilesPanelProps = {
  apiBase: PM_API_BASE,
  listFn: entityAttachmentService.list,
  uploadFn: entityAttachmentService.upload,
  deleteFn: entityAttachmentService.delete,
};
