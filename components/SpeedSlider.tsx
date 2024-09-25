import React from 'react';
import SpeedIcon from '../components/icons/speed';

interface SpeedSliderProps {
    speed: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SpeedSlider = ({speed, onChange}: SpeedSliderProps) => {

    return (
        <div className="flex flex-row items-center text-bg-light p-2 w-full space-x-4">
            <div className="flex flex-1 justify-end">
                <SpeedIcon className="text-light" />
            </div>
            <div className="flex-shrink-0">
                <input
                    type="range"
                    min={1}
                    max={100}
                    value={speed.toString()}
                    onChange={onChange}
                />
            </div>
            <div className="text-light flex-1">{speed.toString() === '100' ? "Instant" : speed.toString() } </div>
        </div>
    );
};

export default SpeedSlider;