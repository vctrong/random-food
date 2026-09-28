/** Giới hạn số món yêu thích tối đa mỗi user, tránh spam vào Favorite collection. */
export const MAX_FAVORITES_PER_USER = 300;

/** Giới hạn phân trang cho các danh sách cá nhân (favorites/experiences/reviews). */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const MAX_REVIEW_COMMENT_LENGTH = 1000;

/** Ảnh món ăn khi đóng góp/chỉnh sửa: tối đa số ảnh và dung lượng mỗi ảnh. */
export const MAX_FOOD_IMAGES = 5;
export const MAX_FOOD_IMAGE_BYTES = 5 * 1024 * 1024;

/** Ảnh quán khi tạo quán mới — không bắt buộc (0–3 ảnh). */
export const MAX_RESTAURANT_IMAGES = 3;

/** Ảnh được nén phía client trước khi upload: cạnh dài tối đa (px) và chất lượng JPEG/WebP. */
export const UPLOAD_MAX_DIMENSION = 1600;
export const UPLOAD_QUALITY = 0.82;

/** Thời hạn đánh giá: sửa trong 24h kể từ lúc tạo review, viết review trong 72h kể từ lần check-in (BR-RV09, BR-RV10). */
export const REVIEW_EDIT_WINDOW_HOURS = 24;
export const REVIEW_CREATE_WINDOW_HOURS = 72;
