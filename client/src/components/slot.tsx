
export default function Slot({color, x, y,handleClick}: {color: string, x: number, y: number, handleClick: ({column}:{column:number})=>void}) {
  
  return (
    <div className={`w-16 h-16 cursor-pointer border rounded-full m-5 border-gray-300`}  data-x={x} data-y={y} onClick={()=>handleClick({column:x})}>
      {color && <img src={`/${color}.svg`} alt="" />}
    </div>
  )
}
