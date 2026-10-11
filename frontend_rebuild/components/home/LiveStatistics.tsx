"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  liveStatisticsService,
} from "@/services/live-statistics-service";

import type {
  LiveStatistics,
} from "@/types/live-statistics";

import styles
  from "./LiveStatistics.module.css";


type StatisticsState =
  | {
      status: "loading";
      value: null;
    }
  | {
      status: "ready";
      value: LiveStatistics;
    }
  | {
      status: "unavailable";
      value: null;
    };


const numberFormatter =
  new Intl.NumberFormat(
    "en-NG",
    {
      maximumFractionDigits: 0,
    },
  );


function formatCount(
  value: number,
): string {
  return numberFormatter.format(
    value,
  );
}


export default function LiveStatistics() {
  const [
    state,
    setState,
  ] = useState<StatisticsState>({
    status: "loading",
    value: null,
  });


  useEffect(() => {
    let active = true;

    void liveStatisticsService
      .getLiveStatistics()
      .then((value) => {
        if (!active) {
          return;
        }

        setState({
          status: "ready",
          value,
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setState({
          status: "unavailable",
          value: null,
        });
      });

    return () => {
      active = false;
    };
  }, []);


  if (
    state.status ===
    "unavailable"
  ) {
    return null;
  }


  const statistics =
    state.status === "ready"
      ? state.value
      : null;


  return (
    <section
      className={styles.section}
      aria-labelledby="live-statistics-title"
    >
      <div className={styles.shell}>
        <div className={styles.introduction}>
          <span className={styles.eyebrow}>
            HomeLink today
          </span>

          <h2
            id="live-statistics-title"
            className={styles.title}
          >
            A growing community,
            connected around home.
          </h2>

          <p className={styles.description}>
            Real activity across rentals,
            properties and the student
            marketplace.
          </p>
        </div>

        <div
          className={styles.statistics}
          aria-live="polite"
          aria-busy={
            state.status === "loading"
          }
        >
          <article className={styles.statistic}>
            <span
              className={styles.number}
            >
              {statistics
                ? formatCount(
                    statistics
                      .total_visitors,
                  )
                : "—"}
            </span>

            <span className={styles.label}>
              Platform visitors
            </span>

            <span
              className={styles.detail}
            >
              People who have explored
              HomeLink
            </span>
          </article>

          <article className={styles.statistic}>
            <span
              className={styles.number}
            >
              {statistics
                ? formatCount(
                    statistics
                      .registered_users,
                  )
                : "—"}
            </span>

            <span className={styles.label}>
              Registered users
            </span>

            <span
              className={styles.detail}
            >
              Members of the HomeLink
              community
            </span>
          </article>

          <article className={styles.statistic}>
            <span
              className={
                styles.onlineNumber
              }
            >
              <span
                className={
                  styles.onlineIndicator
                }
                aria-hidden="true"
              />

              {statistics
                ? formatCount(
                    statistics
                      .online_now,
                  )
                : "—"}
            </span>

            <span className={styles.label}>
              Exploring now
            </span>

            <span
              className={styles.detail}
            >
              Approximate live activity
              during the last five minutes
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}