/**
 * Approvals & proofing (W9), team side: versions, pinned comments and decisions on a task.
 */
import { uploadFileToStrapi } from '@webfudge/utils';
import strapiClient from '../strapiClient';

export const listTaskProofs = async (taskId) => (await strapiClient.get(`/proofs/tasks/${taskId}`))?.data;

export async function uploadProofVersion(taskId, { file, note }) {
  const uploaded = await uploadFileToStrapi(file, { post: (path, body) => strapiClient.post(path, body) });
  return (await strapiClient.post(`/proofs/tasks/${taskId}/versions`, { fileId: uploaded.id, note }))?.data;
}

export const addProofComment = async (versionId, payload) =>
  (await strapiClient.post(`/proofs/versions/${versionId}/comments`, payload))?.data;

export const decideProofVersion = async (versionId, { decision, comment }) =>
  (await strapiClient.post(`/proofs/versions/${versionId}/decision`, { decision, comment }))?.data;

export const resolveProofComment = async (commentId, resolved) =>
  (await strapiClient.put(`/proofs/comments/${commentId}`, { resolved }))?.data;
