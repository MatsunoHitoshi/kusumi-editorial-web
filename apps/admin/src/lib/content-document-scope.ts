import type { Prisma } from "@prisma/client";

/** 論理削除されていない `ContentDocument` のみ（一覧・取得・更新・公開対象） */
export const notDeletedContentWhere: Prisma.ContentDocumentWhereInput = {
  deletedAt: null
};
