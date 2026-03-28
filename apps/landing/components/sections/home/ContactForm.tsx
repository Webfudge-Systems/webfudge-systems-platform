'use client'

export default function ContactForm() {
  return (
    <div className="bg-[#8C8C8C1F] border border-black/5 rounded-2xl p-6 shadow-lg backdrop-blur-md">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <input
          type="text"
          placeholder="Name"
          className="
            w-full
            block
            rounded-lg
            bg-white
            border border-gray-200
            px-4 py-3
            text-sm text-gray-900
            placeholder:text-gray-400
            focus:ring-2 focus:ring-orange-400
            focus:border-transparent
            outline-none
          "
        />
        <input
          type="email"
          placeholder="Email"
          className="
            w-full
            block
            rounded-lg
            bg-white
            border border-gray-200
            px-4 py-3
            text-sm text-gray-900
            placeholder:text-gray-400
            focus:ring-2 focus:ring-orange-400
            focus:border-transparent
            outline-none
          "
        />
        <textarea
          placeholder="Message"
          className="
            h-48
            w-full
            block
            resize-none
            rounded-lg
            bg-white
            border border-gray-200
            px-4 py-3
            text-sm text-gray-900
            placeholder:text-gray-400
            focus:ring-2 focus:ring-orange-400
            focus:border-transparent
            outline-none
          "
        />
        <button
          type="submit"
          className="
            w-full
            bg-orange-500
            hover:bg-orange-600
            text-white
            rounded-lg
            py-4
            text-sm
            font-medium
            transition-all
          "
        >
          Submit
        </button>
      </form>
    </div>
  )
}
