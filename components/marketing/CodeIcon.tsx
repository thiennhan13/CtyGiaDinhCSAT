const paths: Record<string, string[]> = {
    terminal: ['M5 4h33l5 5v35H5z', 'M5 14h38M11 9h2m4 0h2m4 0h2M13 23l7 6-7 6m12 0h10'],
    brackets: ['M16 6H8v14l-5 4 5 4v14h8m16-36h8v14l5 4-5 4v14h-8M28 13l-8 22'],
    branch: ['M12 7v25l9 9h15M12 23h16l8-8V7', 'M7 3h10v10H7zm24 0h10v10H31zm0 33h10v10H31z'],
    loop: ['M34 10H14L6 18v16l8 8h20l8-8V18l-8-8M25 3l9 7-9 7M23 35l-9 7 9 5'],
    array: ['M4 12h40v24H4zM17 12v24m14-24v24M9 20h3v8H9m13-8h4v8h-4m14-8h3v8h-3', 'M4 6h13m14 36h13'],
    graph: ['M12 12l24 4-12 22L12 12m0 0L5 33l19 5', 'M7 7h10v10H7zm24 4h10v10H31zM19 33h10v10H19zM1 29h8v8H1z'],
    search: ['M5 6h20l7 7v16l-7 7H12l-7-7zM31 32l13 13M12 15h13m-13 7h8'],
    pointers: ['M4 12h40v24H4zM16 12v24m16-24v24M9 4v5m30-5v5M8 42l8-5m24 5-8-5'],
    merge: ['M5 5h12v10H5zm26 0h12v10H31zM11 15v9l13 8 13-8v-9M18 33h12v11H18z'],
    knapsack: ['M16 12V5h16v7M10 12h28l5 31H5zM15 23h18v12H15zM21 23v12'],
    cube: ['M24 3 44 14v22L24 47 4 36V14zM4 14l20 11 20-11M24 25v22M14 9l20 11v12'],
    function: ['M5 4h38v40H5zM31 12h-8l-5 25M12 22h19M33 32l6 6m0-6-6 6'],
};
export function CodeIcon({ name, className = '' }: {
    name: string;
    className?: string;
}) {
    return <svg viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={`code-icon ${className}`} aria-hidden="true" focusable="false">{(paths[name] || paths.terminal).map((d, i) => <path d={d} key={i}/>)}</svg>;
}
