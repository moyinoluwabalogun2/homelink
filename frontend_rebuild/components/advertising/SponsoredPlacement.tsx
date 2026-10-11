"use client";

import Image from "next/image";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ExternalLink,
} from "lucide-react";

import {
  advertisingService,
} from "@/services/advertising-service";

import type {
  AdvertisementPlacement,
  PublicAdvertisement,
} from "@/types/advertising";

import styles
  from "./SponsoredPlacement.module.css";


interface SponsoredPlacementProps {
  placement: AdvertisementPlacement;
  areaId?: string | null;
  className?: string;
  compact?: boolean;
}


const ROTATION_MS = 8_000;


export default function SponsoredPlacement({
  placement,
  areaId = null,
  className = "",
  compact = false,
}: SponsoredPlacementProps) {
  const [
    advertisements,
    setAdvertisements,
  ] = useState<
    PublicAdvertisement[]
  >([]);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const [
    ready,
    setReady,
  ] = useState(false);

  const recordedImpressions =
    useRef(
      new Set<string>(),
    );


  useEffect(
    () => {
      let active = true;

      setReady(false);

      advertisingService
        .listLive(
          placement,
          areaId,
        )
        .then((items) => {
          if (!active) {
            return;
          }

          setAdvertisements(
            items,
          );

          setActiveIndex(0);
        })
        .catch(() => {
          if (active) {
            setAdvertisements(
              [],
            );
          }
        })
        .finally(() => {
          if (active) {
            setReady(true);
          }
        });

      return () => {
        active = false;
      };
    },
    [
      areaId,
      placement,
    ],
  );


  useEffect(
    () => {
      if (
        advertisements.length <=
        1
      ) {
        return;
      }

      const timer =
        window.setInterval(
          () => {
            setActiveIndex(
              (current) =>
                (
                  current + 1
                ) %
                advertisements.length,
            );
          },
          ROTATION_MS,
        );

      return () => {
        window.clearInterval(
          timer,
        );
      };
    },
    [
      advertisements.length,
    ],
  );


  const activeAdvertisement =
    useMemo(
      () =>
        advertisements[
          activeIndex
        ] ?? null,
      [
        activeIndex,
        advertisements,
      ],
    );


  useEffect(
    () => {
      if (
        !activeAdvertisement
      ) {
        return;
      }

      if (
        recordedImpressions
          .current
          .has(
            activeAdvertisement.id,
          )
      ) {
        return;
      }

      recordedImpressions
        .current
        .add(
          activeAdvertisement.id,
        );

      void advertisingService
        .recordImpression(
          activeAdvertisement.id,
        );
    },
    [
      activeAdvertisement,
    ],
  );


  if (
    !ready ||
    !activeAdvertisement
  ) {
    return null;
  }


  const clickUrl =
    advertisingService.clickUrl(
      activeAdvertisement.id,
    );


  return (
    <aside
      className={[
        styles.wrapper,
        compact
          ? styles.compact
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Sponsored business"
    >
      <a
        href={clickUrl}
        className={styles.card}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={
          `Sponsored: ${activeAdvertisement.headline}`
        }
      >
        <div
          className={styles.media}
        >
          <Image
            src={
              activeAdvertisement
                .image_url
            }
            alt=""
            fill
            sizes={
              compact
                ? "(max-width: 700px) 100vw, 420px"
                : "(max-width: 700px) 100vw, 1180px"
            }
            quality={82}
            className={
              styles.image
            }
          />

          <div
            className={
              styles.overlay
            }
            aria-hidden="true"
          />
        </div>

        <div
          className={
            styles.content
          }
        >
          <div
            className={
              styles.meta
            }
          >
            <span
              className={
                styles.sponsored
              }
            >
              Sponsored
            </span>

            <span
              className={
                styles.business
              }
            >
              {
                activeAdvertisement
                  .business_name
              }
            </span>
          </div>

          <div
            className={
              styles.copy
            }
          >
            <h2>
              {
                activeAdvertisement
                  .headline
              }
            </h2>

            <p>
              {
                activeAdvertisement
                  .description
              }
            </p>
          </div>

          <span
            className={
              styles.action
            }
          >
            {
              activeAdvertisement
                .call_to_action
            }

            <ExternalLink
              aria-hidden="true"
            />
          </span>
        </div>
      </a>

      {advertisements.length > 1 ? (
        <div
          className={
            styles.pagination
          }
          aria-label="Sponsored content pages"
        >
          {advertisements.map(
            (
              advertisement,
              index,
            ) => (
              <button
                key={
                  advertisement.id
                }
                type="button"
                className={
                  index ===
                  activeIndex
                    ? styles.activeDot
                    : styles.dot
                }
                onClick={() => {
                  setActiveIndex(
                    index,
                  );
                }}
                aria-label={
                  `Show sponsored item ${index + 1}`
                }
                aria-pressed={
                  index ===
                  activeIndex
                }
              />
            ),
          )}
        </div>
      ) : null}
    </aside>
  );
}