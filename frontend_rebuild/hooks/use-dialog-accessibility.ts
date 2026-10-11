"use client";

import {
  type RefObject,
  useEffect,
  useRef,
} from "react";


const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");


interface DialogAccessibilityOptions<
  ContainerElement extends HTMLElement,
  InitialElement extends HTMLElement,
> {
  open:
    boolean;

  containerRef:
    RefObject<ContainerElement>;

  onClose:
    () => void;

  initialFocusRef?:
    RefObject<InitialElement>;

  lockScroll?:
    boolean;
}


export function useDialogAccessibility<
  ContainerElement extends HTMLElement,
  InitialElement extends HTMLElement = HTMLElement,
>({
  open,
  containerRef,
  onClose,
  initialFocusRef,
  lockScroll = true,
}: DialogAccessibilityOptions<
  ContainerElement,
  InitialElement
>): void {
  const closeRef =
    useRef(
      onClose,
    );


  useEffect(() => {
    closeRef.current =
      onClose;
  }, [
    onClose,
  ]);


  useEffect(() => {
    if (!open) {
      return;
    }


    const previouslyFocused =
      document.activeElement
      instanceof HTMLElement
        ? document.activeElement
        : null;


    const previousOverflow =
      document.body.style
        .overflow;


    if (lockScroll) {
      document.body.style
        .overflow =
        "hidden";
    }


    const focusTimer =
      window
        .requestAnimationFrame(
          () => {
            const target =
              initialFocusRef
                ?.current
              ??
              containerRef
                .current
                ?.querySelector<
                  HTMLElement
                >(
                  FOCUSABLE_SELECTOR,
                )
              ??
              containerRef
                .current;

            target?.focus();
          },
        );


    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key
        === "Escape"
      ) {
        event.preventDefault();

        closeRef.current();

        return;
      }


      if (
        event.key
          !== "Tab"
        ||
        !containerRef.current
      ) {
        return;
      }


      const focusable =
        Array.from(
          containerRef
            .current
            .querySelectorAll<
              HTMLElement
            >(
              FOCUSABLE_SELECTOR,
            ),
        ).filter(
          (
            element,
          ) =>
            !element
              .hasAttribute(
                "disabled",
              )
            &&
            element
              .getAttribute(
                "aria-hidden",
              )
              !== "true"
            &&
            element
              .getClientRects()
              .length > 0,
        );


      if (
        focusable.length
        === 0
      ) {
        event.preventDefault();

        containerRef
          .current
          .focus();

        return;
      }


      const first =
        focusable[0];

      const last =
        focusable[
          focusable.length - 1
        ];


      if (
        event.shiftKey
        &&
        document.activeElement
          === first
      ) {
        event.preventDefault();

        last.focus();

      } else if (
        !event.shiftKey
        &&
        document.activeElement
          === last
      ) {
        event.preventDefault();

        first.focus();
      }
    };


    document.addEventListener(
      "keydown",
      handleKeyDown,
    );


    return () => {
      window
        .cancelAnimationFrame(
          focusTimer,
        );

      document
        .removeEventListener(
          "keydown",
          handleKeyDown,
        );

      if (lockScroll) {
        document.body.style
          .overflow =
          previousOverflow;
      }

      previouslyFocused
        ?.focus();
    };
  }, [
    containerRef,
    initialFocusRef,
    lockScroll,
    open,
  ]);
}