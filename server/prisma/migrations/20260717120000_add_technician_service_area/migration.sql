-- Add privacy-preserving, optional service-area coordinates for map browsing.
-- Existing technicians continue to work and can use an application-level
-- neighborhood/municipality centroid until they choose their own area.
ALTER TABLE "Technician"
ADD COLUMN "serviceAreaLatitude" DOUBLE PRECISION,
ADD COLUMN "serviceAreaLongitude" DOUBLE PRECISION,
ADD COLUMN "serviceAreaRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN "mapVisible" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Technician"
ADD CONSTRAINT "Technician_service_area_coordinate_pair_check"
CHECK (
  ("serviceAreaLatitude" IS NULL AND "serviceAreaLongitude" IS NULL)
  OR
  ("serviceAreaLatitude" IS NOT NULL AND "serviceAreaLongitude" IS NOT NULL)
),
ADD CONSTRAINT "Technician_service_area_latitude_check"
CHECK ("serviceAreaLatitude" IS NULL OR "serviceAreaLatitude" BETWEEN -90 AND 90),
ADD CONSTRAINT "Technician_service_area_longitude_check"
CHECK ("serviceAreaLongitude" IS NULL OR "serviceAreaLongitude" BETWEEN -180 AND 180),
ADD CONSTRAINT "Technician_service_area_radius_check"
CHECK ("serviceAreaRadiusKm" BETWEEN 1 AND 100);
