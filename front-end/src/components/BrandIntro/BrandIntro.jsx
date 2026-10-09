import React, { useEffect, useRef, useState } from "react";
import "./BrandIntro.css";

const MARKERS = Array.from({ length: 60 }, (_, index) => index);
const LOGO_LETTERS = [..."MOXIE"];

function WatchFace({ hourHand, minuteHand, secondHand }) {
    return (
        <div className="watch" aria-label="Analog clock showing the current time">
            <div className="watch__crown" aria-hidden="true" />
            <div className="watch__bezel">
                <div className="watch__dial">
                    <div className="watch__markers" aria-hidden="true">
                        {MARKERS.map((index) => (
                            <i
                                className={`marker${index % 5 === 0 ? " major" : ""}`}
                                style={{ transform: `rotate(${index * 6}deg)` }}
                                key={index}
                            />
                        ))}
                    </div>

                    <div className="watch__signature" aria-hidden="true">
                        <span>MOXIE</span>
                        <small>GENÈVE</small>
                    </div>

                    <div className="watch__hand watch__hand--hour" ref={hourHand} />
                    <div className="watch__hand watch__hand--minute" ref={minuteHand} />
                    <div className="watch__hand watch__hand--second" ref={secondHand} />
                    <div className="watch__pin" aria-hidden="true" />
                    <div className="watch__glass" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

export default function BrandIntro({ children }) {
    const [isExiting, setIsExiting] = useState(false);
    const [isHomepageVisible, setIsHomepageVisible] = useState(false);
    const [isLoaderHidden, setIsLoaderHidden] = useState(false);
    const hourHand = useRef(null);
    const minuteHand = useRef(null);
    const secondHand = useRef(null);

    useEffect(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const introDuration = reduceMotion ? 150 : 1500;
        const spinDuration = reduceMotion ? 0 : 1300;
        const introStart = performance.now();
        let clockFrame;
        let hideTimer;

        document.body.classList.add("is-loading");

        const setHandAngles = (hour, minute, second, extraRotation = 0) => {
            const secondAngle = second * 6 + extraRotation;
            const minuteAngle = minute * 6 + second * 0.1 + extraRotation;
            const hourAngle = (hour % 12) * 30 + minute * 0.5 + extraRotation;

            if (hourHand.current) hourHand.current.style.transform = `rotate(${hourAngle}deg)`;
            if (minuteHand.current) minuteHand.current.style.transform = `rotate(${minuteAngle}deg)`;
            if (secondHand.current) secondHand.current.style.transform = `rotate(${secondAngle}deg)`;
        };

        const animateClock = (now) => {
            const date = new Date();
            const elapsed = now - introStart;
            const spinProgress = Math.min(elapsed / spinDuration, 1);
            const easedSpin = 1 - Math.pow(1 - spinProgress, 4);
            const extraRotation = spinDuration ? easedSpin * 1440 : 0;

            setHandAngles(
                date.getHours(),
                date.getMinutes(),
                date.getSeconds() + date.getMilliseconds() / 1000,
                extraRotation,
            );

            clockFrame = requestAnimationFrame(animateClock);
        };

        clockFrame = requestAnimationFrame(animateClock);

        const revealTimer = window.setTimeout(() => {
            setIsExiting(true);
            setIsHomepageVisible(true);
            document.body.classList.remove("is-loading");
            hideTimer = window.setTimeout(() => setIsLoaderHidden(true), 500);
        }, introDuration);

        return () => {
            cancelAnimationFrame(clockFrame);
            clearTimeout(revealTimer);
            clearTimeout(hideTimer);
            document.body.classList.remove("is-loading");
        };
    }, []);

    return (
        <>
            {!isLoaderHidden && (
                <div
                    className={`loader${isExiting ? " is-exiting" : ""}`}
                    aria-label="MOXIE is loading"
                    aria-hidden={isExiting}
                >
                    <div className="loader__grain" aria-hidden="true" />

                    <div className="loader__content">
                        <WatchFace hourHand={hourHand} minuteHand={minuteHand} secondHand={secondHand} />

                        <div className="loader__brand" aria-label="MOXIE">
                            <div className="logo" aria-hidden="true">
                                {LOGO_LETTERS.map((letter, index) => (
                                    <span style={{ "--i": index }} key={`${letter}-${index}`}>{letter}</span>
                                ))}
                            </div>
                            <p className="loader__tagline">THE MEASURE OF DISTINCTION</p>
                        </div>
                    </div>

                    <div className="loader__line" aria-hidden="true"><span /></div>
                </div>
            )}

            <div
                className={`homepage${isHomepageVisible ? " is-visible" : ""}`}
                aria-hidden={!isHomepageVisible}
            >
                {children}
            </div>
        </>
    );
}
