import React from 'react';
import SpeedIcon from '../components/icons/speed';

interface SpeedSliderProps {
    speed: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SpeedSlider = ({speed, onChange}: SpeedSliderProps) => {

    return (
        <div className="flex flex-wrap items-center justify-start text-bg-light px-2 w-[250px] select-none">
            <div className="flex flex-nowrap items-center space-x-3">
                <div className="">
                    <SpeedIcon className="text-light" />
                </div>
                <input
                    type="range"
                    min={1}
                    max={100}
                    value={speed.toString()}
                    onChange={onChange}
                    className="flex-shrink min-w-[70px] pr-3"
                />
            </div>
            <div className="text-light w-14">{speed.toString() === '100' ? "Instant" : speed.toString() } </div>
        </div>
    );
};

export default SpeedSlider;