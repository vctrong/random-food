/** Giới hạn số món yêu thích tối đa mỗi user, tránh spam vào Favorite collection. */
export const MAX_FAVORITES_PER_USER = 300;

/** Giới hạn phân trang cho các danh sách cá nhân (favorites/experiences/reviews). */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

export const MAX_REVIEW_COMMENT_LENGTH = 1000;

/** Ảnh món ăn khi đóng góp/chỉnh sửa: tối đa số ảnh và dung lượng mỗi ảnh. */
export const MAX_FOOD_IMAGES = 5;
export const MAX_FOOD_IMAGE_BYTES = 5 * 1024 * 1024;
