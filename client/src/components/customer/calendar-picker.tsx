import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { InstallationDate } from "@shared/schema";
import { format, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarPickerProps {
  onDateTimeSelect: (selection: InstallationDate | null) => void;
}

export function CalendarPicker({ onDateTimeSelect }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimes] = useState([
    "09:00", "11:00", "13:00", "15:00", "17:00", "19:00"
  ]);

  // Always start with tomorrow as the earliest available date
  const tomorrow = addDays(new Date(), 1);
  
  // Effect to update parent component when selections change
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      onDateTimeSelect({ date: formattedDate, time: selectedTime });
    } else {
      onDateTimeSelect(null);
    }
  }, [selectedDate, selectedTime, onDateTimeSelect]);

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const onDateClick = (day: Date) => {
    // Only allow selection of future dates, starting with tomorrow
    if (day >= tomorrow) {
      setSelectedDate(day);
    }
  };

  const onTimeClick = (time: string) => {
    setSelectedTime(time);
  };

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="outline" 
          size="icon"
          onClick={prevMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-center font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button 
          variant="outline" 
          size="icon"
          onClick={nextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEEEE";
    const days = [];
    const startDate = startOfWeek(currentMonth);

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center text-xs" key={i}>
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }

    return <div className="grid grid-cols-7 gap-1 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isToday = isSameDay(day, new Date());
        const isSelected = selectedDate && isSameDay(day, selectedDate);
        const isSelectable = day >= tomorrow;

        days.push(
          <div
            className={`p-2 text-center 
              ${!isSameMonth(day, monthStart) ? "text-gray-400" : ""} 
              ${isToday ? "bg-blue-100" : ""} 
              ${isSelected ? "bg-primary text-white rounded-full" : ""} 
              ${isSelectable ? "hover:bg-gray-100 cursor-pointer" : "opacity-50 cursor-not-allowed"}`
            }
            key={day.toString()}
            onClick={() => isSelectable && onDateClick(cloneDay)}
          >
            {format(day, "d")}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="mb-4">{rows}</div>;
  };

  const renderTimeSlots = () => {
    if (!selectedDate) return null;

    return (
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Select a time</h3>
        <div className="grid grid-cols-3 gap-2">
          {availableTimes.map((time) => (
            <Button
              key={time}
              variant={selectedTime === time ? "default" : "outline"}
              className={`
                p-2 text-sm text-center
                ${selectedTime === time ? "bg-primary text-white" : "border-gray-300 text-gray-700"}
              `}
              onClick={() => onTimeClick(time)}
            >
              {time}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderTimeSlots()}
    </div>
  );
}
