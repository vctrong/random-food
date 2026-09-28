"use client";

import { useMemo, useState } from "react";
import { MAX_FOOD_IMAGES, MAX_RESTAURANT_IMAGES } from "@/constants/limits";
import { submitNewFood, type NewFoodPayload } from "@/services/contributionService";
import type { EatingLevel } from "@/types/food";
import type { RestaurantOption } from "@/types/restaurant";
import { countMissingFields, getFieldValidity, parsePrice } from "./formProgress";
import { useImageUploads } from "./useImageUploads";
import { useRestaurantLocation } from "./useRestaurantLocation";

/** State + gửi form "Thêm món ăn mới" — component chỉ lo hiển thị. */
export function useContributeFoodForm() {
  const foodImages = useImageUploads("food", MAX_FOOD_IMAGES);
  const restaurantImages = useImageUploads("restaurant", MAX_RESTAURANT_IMAGES);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [eatingLevels, setEatingLevels] = useState<EatingLevel[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [proposalName, setProposalName] = useState<string | null>(null);

  const [restaurantMode, setRestaurantMode] = useState<"existing" | "new">("existing");
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantOption | null>(null);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const location = useRestaurantLocation(newRestaurantName);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshot = {
    foodImagesUploaded: foodImages.urls.length,
    name,
    priceMin: parsePrice(priceMin),
    priceMax: parsePrice(priceMax),
    eatingLevelCount: eatingLevels.length,
    categoryCount: categoryIds.length,
    hasProposal: Boolean(proposalName),
    restaurantMode,
    hasSelectedRestaurant: Boolean(selectedRestaurant),
    newRestaurantName,
    newRestaurantAddress: location.address,
  };
  const validity = getFieldValidity(snapshot);
  const missingCount = countMissingFields(snapshot);
  const isUploading = foodImages.isUploading || (restaurantMode === "new" && restaurantImages.isUploading);

  function toggleEatingLevel(level: EatingLevel) {
    setEatingLevels((prev) => (prev.includes(level) ? prev.filter((item) => item !== level) : [...prev, level]));
  }

  function startNewRestaurant(prefillName: string) {
    setRestaurantMode("new");
    setSelectedRestaurant(null);
    if (prefillName) setNewRestaurantName(prefillName);
  }

  function pickExistingRestaurant(restaurant: RestaurantOption) {
    setSelectedRestaurant(restaurant);
    setRestaurantMode("existing");
  }

  const payload = useMemo((): NewFoodPayload | null => {
    const min = parsePrice(priceMin);
    const max = parsePrice(priceMax);
    if (min === null || max === null) return null;
    return {
      name: name.trim(),
      description: description.trim(),
      priceMin: min,
      priceMax: max,
      eatingLevels,
      categoryIds,
      proposedCategoryName: proposalName,
      images: foodImages.urls,
      restaurant:
        restaurantMode === "existing"
          ? { mode: "existing", id: selectedRestaurant?.id ?? "" }
          : {
              mode: "new",
              name: newRestaurantName.trim(),
              address: location.address.trim(),
              location: location.pin.location,
              locationSource: location.pin.location ? location.pin.source : "none",
              images: restaurantImages.urls,
            },
    };
  }, [
    name,
    description,
    priceMin,
    priceMax,
    eatingLevels,
    categoryIds,
    proposalName,
    foodImages.urls,
    restaurantMode,
    selectedRestaurant,
    newRestaurantName,
    location.address,
    location.pin,
    restaurantImages.urls,
  ]);

  async function submit(): Promise<boolean> {
    if (missingCount > 0 || isUploading || isSubmitting || !payload) return false;
    setIsSubmitting(true);
    setError(null);
    const result = await submitNewFood(payload);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }

  return {
    foodImages,
    restaurantImages,
    name,
    setName,
    description,
    setDescription,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    eatingLevels,
    toggleEatingLevel,
    categoryIds,
    setCategoryIds,
    proposalName,
    setProposalName,
    restaurantMode,
    setRestaurantMode,
    selectedRestaurant,
    pickExistingRestaurant,
    startNewRestaurant,
    newRestaurantName,
    setNewRestaurantName,
    location,
    validity,
    missingCount,
    isUploading,
    isSubmitting,
    error,
    submit,
  };
}
