// Se muestra al instante al cambiar de sección mientras llegan los datos.
export default function Loading() {
  const bar = 'animate-pulse rounded-2xl bg-surface'
  return (
    <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-5">
      <div className="mb-1 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <div className={`${bar} h-8 w-48 rounded-xl`} />
          <div className={`${bar} h-4 w-64 rounded-lg`} />
        </div>
        <div className={`${bar} hidden h-10 w-40 rounded-full md:block`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={`${bar} h-20`} />
        <div className={`${bar} h-20`} />
      </div>
      <div className={`${bar} h-[420px]`} />
    </div>
  )
}
