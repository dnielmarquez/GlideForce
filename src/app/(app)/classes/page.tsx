'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PageTransition from '@/components/PageTransition';

const i1 = "https://lh3.googleusercontent.com/aida-public/AB6AXuBlTIX2c0YLEM31fa8dvXo8YXKgTQCDf5KeisuISVpwYYPcpytHwooEWAYwzLSvkZyWU1SWUViVYF-iOHbyAmzPjYCbjO0sTNxyP1V5OguCoqKyLvlMW-8st3UQrPTtCU7t9Y3xYT3yjnpPvQMhuyJEYyRofpUQ40QxtIVeClq0xmnjGtS8T7llSu3ADIhjFInPWFwpRhIzPKe6YEvZqKHKj4fyF4kD-_uUG0ix7UCkCvS-WHXZqGwNu5jlEyKU2Xb_whVAsDVYuYk";
const i2 = "https://lh3.googleusercontent.com/aida-public/AB6AXuB5zfrO3MqE8xhrpxMXC1qC63uF8NW1LHokY076UJ9NLOd8frOG0SiSm8Fu_N-xr_KtSACFtxE7cWJWKxLtYtIEtlwBgY_CEa4thGmUiyjVL2zZ4XWF1H7128rEa7qeNyQ6egRPJMF1KBrORYFyNNVVw46IcJ_FyUDZ1yNp6bbDj3eWqs0Y_-4P9Wd8PkeyDlGGr5jzXGXBWMpHBMmCQFnwZ7dJEaQjSKgvSHto_ld_1jzuP8zXULbkjCrSZdmo8Bu0F24cCuMzwLE";
const i3 = "https://lh3.googleusercontent.com/aida-public/AB6AXuAcSpdaNGNgMLkT11ZdAk0lcuEQlHuYcdsnfHfocuLNWFIe7EBRVapXsXjHhgBFGt-LaLF1MW4yUiqOOKR7yOCcrQymQEAPy5ZKrztN0cPYsLbLVubfL3OgMURpD8bkYyKTGjogBTPb7gTdr-sn14nsE9jpyelbOGehLtty-5RKq0I6uJDlh7_oQyBS9Rmb4kIgLcQUQ8ePPB6guCpZ4Srr5_BCX2iJXcno_BdewRdtEqS4QG9WrJwnAh_d5ujCqM4tDoVzF7g-fIA";
const i4 = "https://lh3.googleusercontent.com/aida-public/AB6AXuDj-HzF-nuHuNolQakcjaDTTZO7iQIj_sSU2dzjF9HMwDONSRxq4-DG-5tVbRhIr2RCAqf-gAtrDzGcBvux94Ya10Eb_edOvzHkMQDtd2zjosbTf6S9go94DFErHqVvgx3zm4Wmr7LkNMOg3wBQkUwWSp33Kqe8QtO20Fp5VGMM7AmnfnxG1W4YHbjHoO3U-JxJByv9z2W6ikM6f_pAh7OdL1GsY6AT8-QjffAfhNnCmprmoHcc2h4fuK6JPpFwAXcD8XIQ784vvP0";
const tj = "Tania Janek";

const mockClassesByDate: Record<number, { time: string; title: string; dur: string; img: string; prof: string }[]> = {
    1: [{ time: "08:00 AM", title: "Pilates Core", dur: "50 MIN", img: i3, prof: tj }],
    2: [{ time: "10:00 AM", title: "Yoga Flow", dur: "60 MIN", img: i1, prof: tj }, { time: "06:00 PM", title: "HIIT Burn", dur: "45 MIN", img: i2, prof: tj }],
    3: [{ time: "09:00 AM", title: "Spinning", dur: "45 MIN", img: i4, prof: tj }],
    4: [{ time: "07:00 AM", title: "Bootcamp", dur: "60 MIN", img: i2, prof: tj }],
    5: [{ time: "11:00 AM", title: "Stretching", dur: "45 MIN", img: i4, prof: tj }, { time: "05:00 PM", title: "Yoga Flow", dur: "60 MIN", img: i1, prof: tj }],
    6: [{ time: "06:00 PM", title: "Cross Training", dur: "50 MIN", img: i2, prof: tj }],
    7: [{ time: "08:00 AM", title: "Pilates Reformer", dur: "50 MIN", img: i3, prof: tj }],
    8: [{ time: "10:00 AM", title: "HIIT Burn", dur: "45 MIN", img: i2, prof: tj }],
    9: [{ time: "09:00 AM", title: "Vinyasa Yoga", dur: "60 MIN", img: i1, prof: tj }],
    10: [{ time: "07:00 AM", title: "Pilates Core", dur: "50 MIN", img: i3, prof: tj }, { time: "05:00 PM", title: "Spinning", dur: "45 MIN", img: i4, prof: tj }],
    11: [{ time: "11:00 AM", title: "Yoga Flow", dur: "60 MIN", img: i1, prof: tj }],
    12: [{ time: "09:00 AM", title: "Pilates Reformer", dur: "50 MIN", img: i3, prof: tj }],
    13: [{ time: "10:00 AM", title: "Yoga Flow", dur: "60 MIN", img: i1, prof: tj }, { time: "11:30 AM", title: "HIIT Burn", dur: "45 MIN", img: i2, prof: tj }, { time: "05:00 PM", title: "Pilates Core", dur: "50 MIN", img: i3, prof: tj }],
    14: [{ time: "08:00 AM", title: "Vinyasa Yoga", dur: "60 MIN", img: i1, prof: tj }, { time: "06:00 PM", title: "Cross Training", dur: "50 MIN", img: i2, prof: tj }],
    15: [{ time: "07:00 AM", title: "Spinning", dur: "45 MIN", img: i4, prof: tj }],
    16: [{ time: "10:00 AM", title: "Pilates Reformer", dur: "50 MIN", img: i3, prof: tj }, { time: "05:00 PM", title: "Yoga Flow", dur: "60 MIN", img: i1, prof: tj }],
    17: [{ time: "09:00 AM", title: "Bootcamp", dur: "60 MIN", img: i2, prof: tj }, { time: "11:30 AM", title: "HIIT Burn", dur: "45 MIN", img: i2, prof: tj }],
    18: [{ time: "11:00 AM", title: "Stretching", dur: "45 MIN", img: i4, prof: tj }],
    19: [{ time: "08:00 AM", title: "Pilates Core", dur: "50 MIN", img: i3, prof: tj }, { time: "06:00 PM", title: "Yoga Flow", dur: "60 MIN", img: i1, prof: tj }],
    20: [{ time: "10:00 AM", title: "HIIT Burn", dur: "45 MIN", img: i2, prof: tj }],
};

export default function ClassesPage() {
    const router = useRouter();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(new Date().getDate());

    // Drag to scroll logic
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        if (!scrollRef.current) return;
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };
    const onMouseLeave = () => setIsDragging(false);
    const onMouseUp = () => setIsDragging(false);
    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        days.push({ name: dayNames[d.getDay()], date: i, fullDate: d });
    }

    const prevMonth = () => { setCurrentMonth(new Date(year, month - 1, 1)); setSelectedDay(1); };
    const nextMonth = () => { setCurrentMonth(new Date(year, month + 1, 1)); setSelectedDay(1); };

    useEffect(() => {
        const el = document.getElementById(`date-btn-${selectedDay}`);
        if (el && scrollRef.current) {
            const container = scrollRef.current;
            const scrollTarget = el.offsetLeft - container.offsetLeft - (container.offsetWidth / 2) + (el.offsetWidth / 2);
            container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
        }
    }, [selectedDay]);

    return (
        <PageTransition className="bg-surface-container-low font-body text-on-surface min-h-screen max-w-md mx-auto relative shadow-2xl overflow-hidden">
            <main className="pt-20 pb-28 px-6 max-w-md mx-auto">
                <section className="mb-8">
                    <p className="text-on-surface-variant font-medium label-sm uppercase opacity-70">Buenos días</p>
                    <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mt-1">Explora tus Clases</h1>
                </section>
                <section className="mb-10">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-on-surface-variant font-bold uppercase tracking-widest text-sm capitalize">
                            {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                        </span>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant transition-colors" aria-label="Mes anterior">
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant transition-colors" aria-label="Mes siguiente">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>
                    <div
                        ref={scrollRef}
                        onMouseDown={onMouseDown}
                        onMouseLeave={onMouseLeave}
                        onMouseUp={onMouseUp}
                        onMouseMove={onMouseMove}
                        className="flex gap-4 py-4 w-full overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing px-4 -mx-4"
                    >
                        {days.map((day) => {
                            const isSelected = selectedDay === day.date;
                            return (
                                <div
                                    id={`date-btn-${day.date}`}
                                    key={day.date}
                                    onClick={() => setSelectedDay(day.date)}
                                    className={`flex flex-col items-center justify-center min-w-[64px] h-24 rounded-xl transition-all select-none ${isSelected
                                        ? 'bg-primary-container text-white shadow-lg shadow-primary-container/20 scale-105'
                                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high cursor-pointer'
                                        }`}
                                >
                                    <span className={`text-[11px] uppercase tracking-widest ${isSelected ? 'font-bold opacity-80' : 'font-medium'}`}>{day.name}</span>
                                    <span className={`text-2xl ${isSelected ? 'font-black' : 'font-bold'}`}>{day.date}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
                <section className="space-y-6">
                    {(() => {
                        const currentClasses = mockClassesByDate[selectedDay] || [];
                        if (currentClasses.length === 0) {
                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex flex-col items-center justify-center py-16 text-center"
                                >
                                    <span className="material-symbols-outlined text-6xl text-surface-container-highest mb-4" style={{ fontVariationSettings: "'FILL' 0" }}>event_busy</span>
                                    <h3 className="text-xl font-bold text-on-surface tracking-tight">No hay clases hoy</h3>
                                    <p className="text-sm text-on-surface-variant font-medium mt-1">Selecciona otra fecha en el calendario.</p>
                                </motion.div>
                            );
                        }
                        return currentClasses.map((c, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.1, ease: "easeOut" }}
                                className="bg-white rounded-lg p-6 shadow-sm relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className="text-primary-container font-black text-sm tracking-widest uppercase mb-1 block">{c.time}</span>
                                        <h3 className="text-2xl font-extrabold text-on-surface tracking-tight">{c.title}</h3>
                                    </div>
                                    <div className="bg-surface-container-low px-3 py-1 rounded-full text-[10px] font-bold uppercase text-on-surface-variant">{c.dur}</div>
                                </div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-full border-2 border-primary-container/20 overflow-hidden">
                                        <img src={c.img} className="w-full h-full object-cover" alt="Instructor" />
                                    </div>
                                    <span className="font-bold text-on-surface">{c.prof}</span>
                                </div>
                                <button
                                    onClick={() => router.push(`/booking?date=${selectedDay}`)}
                                    className="w-full py-4 bg-primary-container/10 border-2 border-primary-container rounded-full text-primary-container font-black text-sm uppercase tracking-widest hover:bg-primary-container hover:text-white transition-all"
                                >
                                    Reservar
                                </button>
                            </motion.div>
                        ));
                    })()}
                </section>
            </main>
        </PageTransition>
    );
}
